/**
 * @abstract
 */
class BaseConsensus extends Observable {
    /**
     * @param {BaseChain} blockchain
     * @param {Observable} mempool
     * @param {Network} network
     */
    constructor(blockchain, mempool, network) {
        super();
        /** @type {BaseChain} */
        this._blockchain = blockchain;
        /** @type {Network} */
        this._network = network;

        /** @type {HashMap.<Peer,BaseConsensusAgent>} */
        this._agents = new HashMap();

        /** @type {Timers} */
        this._timers = new Timers();

        /** @type {boolean} */
        this._established = false;

        /** @type {Peer} */
        this._syncPeer = null;

        /** @type {Subscription} */
        this._subscription = Subscription.ANY;

        /** @type {InvRequestManager} */
        this._invRequestManager = new InvRequestManager();

        network.on('peer-joined', peer => this._onPeerJoined(peer));
        network.on('peer-left', peer => this._onPeerLeft(peer));

        // Notify peers when our blockchain head changes.
        blockchain.on('head-changed', head => this._onHeadChanged(head));
        blockchain.on('rebranched', (revertBlocks, forkBlocks, blockHash) => this._onRebranched(blockHash, revertBlocks, forkBlocks));
        blockchain.on('extended', (blockHash) => this._onExtended(blockHash));
        this.bubble(blockchain, 'block');

        // Relay new (verified) transactions to peers.
        mempool.on('transaction-added', tx => this._onTransactionAdded(tx));
        mempool.on('transaction-removed', tx => this._onTransactionRemoved(tx));
        this.bubble(mempool, 'transaction-added', 'transaction-removed');
    }

    // 
    // Public consensus interface
    //

    /**
     * @returns {Promise.<Hash>}
     */
    async getHeadHash() {
        return this._blockchain.headHash;
    }

    /**
     * @returns {Promise.<number>}
     */
    async getHeadHeight() {
        return this._blockchain.height;
    }

    /**
     * @param {Hash} hash
     * @param {boolean} [includeBody = true]
     * @param {boolean} [includeBodyFromLocal]
     * @param {number} [blockHeight]
     * @returns {Promise.<?Block>}
     */
    async getBlock(hash, includeBody = true, includeBodyFromLocal = includeBody, blockHeight) {
        let block = await this._blockchain.getBlock(hash, true, includeBody || includeBodyFromLocal);
        // XXX: Fetches full blocks if no peer supports protocol version 2 and it would be full from local.
        includeBody = includeBody || (includeBodyFromLocal && !this._hasPeersWithVersion(2));
        if (!block || (includeBody && !block.isFull())) {
            block = await this._requestBlock(hash, includeBody, block ? block.height : blockHeight, !!block) || block;
        }
        return block;
    }

    /**
     * @param {number} height
     * @param {boolean} [includeBody = true]
     * @returns {Promise.<?Block>}
     */
    async getBlockAt(height, includeBody = true) {
        if (height > this._blockchain.height) {
            return null;
        }
        let block = await this._blockchain.getBlockAt(height, includeBody);
        if (!block) {
            block = await this._requestBlockAt(height, includeBody);
        } else if (block && includeBody && !block.isFull()) {
            block = await this._requestBlock(block.hash(), includeBody, height, true) || block;
        }
        return block;
    }

    /**
     * @param {Address} minerAddress
     * @param {Uint8Array} [extraData]
     * @returns {Promise.<Block>}
     */
    async getBlockTemplate(minerAddress, extraData) {
        throw new Error('not implemented: getBlockTemplate');
    }

    /**
     * @param {Block} block
     * @returns {Promise.<boolean>}
     */
    async submitBlock(block) {
        throw new Error('not implemented: submitBlock');
    }

    /**
     * @param {Array.<Address>} addresses
     * @returns {Promise.<Array.<Account>>}
     * @abstract
     */
    async getAccounts(addresses) {
        throw new Error('not implemented: getAccounts');
    }

    /**
     * @param {Array.<Hash>} hashes
     * @returns {Promise.<Array.<Transaction>>}
     */
    async getPendingTransactions(hashes) {
        return this._requestPendingTransactions(hashes);
    }

    /**
     * @param {Address} address
     * @returns {Promise.<Array.<Transaction>>}
     */
    async getPendingTransactionsByAddress(address) {
        throw new Error('not implemented: getPendingTransactionsByAddress');
    }

    /**
     * @param {Array.<Hash>} hashes
     * @param {Hash} blockHash
     * @param {number} [blockHeight]
     * @param {Block} [block]
     * @returns {Promise.<Array.<Transaction>>}
     */
    async getTransactionsFromBlock(hashes, blockHash, blockHeight, block) {
        if (!block) {
            block = await this.getBlock(blockHash, false, true, blockHeight);
        }
        if (block && block.isFull()) {
            // Just search the block
            return block.transactions.filter(tx => hashes.find(hash => hash.equals(tx.hash())));
        } else {
            return this._requestTransactionsByHashes(hashes, block);
        }
    }

    /**
     * @param {Array.<Address>} addresses
     * @param {Hash} blockHash
     * @param {number} [blockHeight]
     * @returns {Promise.<Array.<Transaction>>}
     */
    async getTransactionsFromBlockByAddresses(addresses, blockHash, blockHeight) {
        let block = await this._blockchain.getBlock(blockHash, false, true);

        if (!block) {
            block = this._requestBlock(blockHash, false, blockHeight);
        }
        if (block && block.isFull()) {
            // Just search the block
            return block.transactions.filter(tx => !!addresses.find(a => a.equals(tx.sender) || a.equals(tx.recipient)));
        } else {
            return this._requestTransactionsByAddress(addresses, block);
        }
    }

    /**
     * @param {Address} address
     * @returns {Promise.<Array.<?TransactionReceipt>>}
     */
    async getTransactionReceiptsByAddress(address) {
        return this._requestTransactionReceiptsByAddress(address);
    }

    /**
     * @param {Array.<Hash>} hashes
     * @returns {Promise.<Array.<?TransactionReceipt>>}
     */
    async getTransactionReceiptsByHashes(hashes) {
        return this._requestTransactionReceiptsByHashes(hashes);
    }

    /**
     * @param {Transaction} tx
     * @returns {Promise.<BaseConsensus.SendTransactionResult>}
     * @abstract
     */
    async sendTransaction(tx) {
        throw new Error('not implemented: sendTransaction');
    }

    /**
     * @returns {Array.<Transaction>}
     */
    getMempoolContents() {
        return [];
    }

    //
    //

    /**
     * @param {number} version
     * @returns {boolean}
     * @private
     */
    _hasPeersWithVersion(version) {
        return !!this._agents.values().find((agent) => agent.peer.version >= version);
    }

    /**
     * @param {Hash} hash
     * @param {boolean} [includeBody=false]
     * @param {?number} [blockHeight]
     * @param {boolean} [proven=false]
     * @returns {Promise.<?Block>}
     */
    async _requestBlock(hash, includeBody = false, blockHeight, proven) {
        /** @type {Block} */
        let block = null;
        if (includeBody || !blockHeight) {
            /** @type {Array.<BaseConsensusAgent>} */
            const agents = [];
            for (const agent of this._agents.valueIterator()) {
                const requiresHistory = !blockHeight || blockHeight < this._blockchain.height - Policy.NUM_BLOCKS_VERIFICATION;
                if (agent.synced && agent.providesServices(Services.FULL_BLOCKS) && (!requiresHistory || agent.providesServices(Services.BLOCK_HISTORY))) {
                    agents.push(agent);
                }
            }

            // Try agents first that (we think) know the block hash.
            agents.sort((a, b) =>
                b.knowsBlock(hash) !== a.knowsBlock(hash)
                    ? -a.knowsBlock(hash) + 0.5
                    : Math.random() - 0.5);

            for (const agent of agents) {
                try {
                    block = await agent.requestBlock(hash);
                    if (block) break;
                } catch (e) {
                    Log.w(BaseConsensus, `Failed to retrieve block for ${hash} from ${agent.peer.peerAddress}: ${e && e.message || e}`);
                    // Try the next peer.
                }
            }
            if (!block) {
                throw new Error(`Failed to retrieve block for ${hash}`);
            }
            if (!proven) await this._requestBlockProof(hash, block.height);
            return block;
        } else {
            // TODO: Should block be proofed?
            return await this._requestBlockProof(hash, blockHeight);
        }
    }

    /**
     * @param {number} blockHeight
     * @param {boolean} [includeBody=false]
     * @returns {Promise.<?Block>}
     */
    async _requestBlockAt(blockHeight, includeBody) {
        /** @type {Block} */
        let block = await this._requestBlockProofAt(blockHeight);
        if (includeBody && !block.isFull()) {
            const hash = block.hash();
            /** @type {Array.<BaseConsensusAgent>} */
            const agents = [];
            for (const agent of this._agents.valueIterator()) {
                const requiresHistory = blockHeight < this._blockchain.height - Policy.NUM_BLOCKS_VERIFICATION;
                if (agent.synced && agent.providesServices(Services.FULL_BLOCKS) && (!requiresHistory || agent.providesServices(Services.BLOCK_HISTORY))) {
                    agents.push(agent);
                }
            }

            // Try agents first that (we think) know the block hash.
            agents.sort((a, b) =>
                b.knowsBlock(hash) !== a.knowsBlock(hash)
                    ? -a.knowsBlock(hash) + 0.5
                    : Math.random() - 0.5);

            for (const agent of agents) {
                try {
                    return await agent.requestBlock(hash);
                } catch (e) {
                    Log.w(BaseConsensus, `Failed to retrieve block for ${hash}@${blockHeight} from ${agent.peer.peerAddress}: ${e && e.message || e}`);
                    // Try the next peer.
                }
            }
            throw new Error(`Failed to retrieve block for ${hash}@${blockHeight}`);
        }
        return block;
    }

    /**
     * @param {Array.<Hash>} hashes
     * @returns {Promise.<Array.<Transaction>>}
     */
    async _requestPendingTransactions(hashes) {
        return Promise.all(hashes.map(hash => this._requestPendingTransaction(hash)));
    }

    /**
     * @param {Hash} hash
     * @return {Promise.<?Transaction>}
     * @private
     */
    async _requestPendingTransaction(hash) {
        /** @type {Array.<BaseConsensusAgent>} */
        const agents = [];
        for (const agent of this._agents.valueIterator()) {
            if (agent.synced && agent.providesServices(Services.BLOCK_HISTORY, Services.FULL_BLOCKS)) {
                agents.push(agent);
            }
        }

        // Try agents first that (we think) know the block hash.
        agents.sort((a, b) =>
            b.knowsTransaction(hash) !== a.knowsTransaction(hash)
                ? -a.knowsTransaction(hash) + 0.5
                : Math.random() - 0.5);

        for (const agent of agents) {
            try {
                const tx = await agent.requestTransaction(hash);
                if (tx) return tx;
            } catch (e) {
                Log.w(BaseConsensus, `Failed to retrieve block for ${hash} from ${agent.peer.peerAddress}: ${e && e.message || e}`);
                // Try the next peer.
            }
        }
        throw new Error(`Failed to retrieve block for ${hash}`);
    }

    /**
     * @param {Array.<Hash>} hashes
     * @returns {Promise.<Array.<?TransactionReceipt>>}
     */
    async _requestTransactionReceiptsByHashes(hashes) {
        const agents = [];
        for (const agent of this._agents.valueIterator()) {
            if (agent.synced && agent.providesServices(Services.TRANSACTION_INDEX) && agent.peer.version >= 2) {
                agents.push(agent);
            }
        }

        for (const /** @type {BaseConsensusAgent} */ agent of agents) {
            try {
                return await agent.getTransactionReceiptsByHashes(hashes); // eslint-disable-line no-await-in-loop
            } catch (e) {
                Log.w(BaseConsensus, `Failed to retrieve transaction receipts for ${hashes} from ${agent.peer.peerAddress}: ${e && e.message || e}`);
                // Try the next peer.
            }
        }

        // No peer supplied the requested transaction, fail.
        throw new Error(`Failed to retrieve transaction receipts for ${hashes}`);
    }

    /**
     * @param {Array.<Hash>} hashes
     * @param {Block} block
     * @returns {Promise.<Array.<?Transaction>>}
     */   
    async _requestTransactionsByHashes(hashes, block) {
        // TODO: Use the agent that provided the receipt
        const agents = [];
        for (const agent of this._agents.valueIterator()) {
            const requiresHistory = blockHeight < this._blockchain.height - Policy.NUM_BLOCKS_VERIFICATION;
            if (agent.synced && agent.providesServices(Services.BODY_PROOF) && (!requiresHistory || agent.providesServices(Services.BLOCK_HISTORY)) && agent.peer.version >= 2) {
                agents.push(agent);
            }
        }

        // Try agents first that (we think) know the reference block hash.
        const knownBlockHash = block.hash();
        agents.sort((a, b) =>
            b.knowsBlock(knownBlockHash) !== a.knowsBlock(knownBlockHash)
                ? -a.knowsBlock(knownBlockHash) + 0.5
                : Math.random() - 0.5);

        for (const /** @type {BaseConsensusAgent} */ agent of agents) {
            try {
                return await agent.getTransactionsProofByHashes(block, hashes); // eslint-disable-line no-await-in-loop
            } catch (e) {
                Log.w(BaseConsensus, `Failed to retrieve transactions for ${hashes} from ${agent.peer.peerAddress}: ${e && e.message || e}`);
                // Try the next peer.
            }
        }

        // No peer supplied the requested transaction, fail.
        throw new Error(`Failed to retrieve transactions for ${hashes}`);
    }

    /**
     * @param {Subscription} subscription
     */
    subscribe(subscription) {
        this._subscription = subscription;
        for (const /** @type {BaseConsensusAgent} */ agent of this._agents.valueIterator()) {
            agent.subscribe(subscription);
        }
    }

    /**
     * @returns {Subscription}
     */
    getSubscription() {
        return this._subscription;
    }

    /**
     * @param {Peer} peer
     * @returns {BaseConsensusAgent}
     * @protected
     */
    _newConsensusAgent(peer) {
        throw new Error('not implemented');
    }

    /**
     * @param {Peer} peer
     * @returns {BaseConsensusAgent}
     * @protected
     */
    _onPeerJoined(peer) {
        // Create a ConsensusAgent for each peer that connects.
        const agent = this._newConsensusAgent(peer);
        this._agents.put(peer.id, agent);

        // Register agent event listeners.
        agent.on('close', () => this._onPeerLeft(agent.peer));
        agent.on('sync', () => this._onPeerSynced(agent.peer));
        agent.on('out-of-sync', () => this._onPeerOutOfSync(agent.peer));
        this.bubble(agent, 'transaction-relayed');

        // If no more peers connect within the specified timeout, start syncing.
        this._timers.resetTimeout('sync', this._syncBlockchain.bind(this), BaseConsensus.SYNC_THROTTLE);

        return agent;
    }

    /**
     * @param {Peer} peer
     * @protected
     */
    _onPeerLeft(peer) {
        // Reset syncPeer if it left during the sync.
        if (peer.equals(this._syncPeer)) {
            Log.d(BaseConsensus, `Peer ${peer.peerAddress} left during sync`);
            this._syncPeer = null;
            this.fire('sync-failed', peer.peerAddress);
        }

        this._agents.remove(peer.id);
        this._syncBlockchain();
    }

    /**
     * @protected
     */
    _syncBlockchain() {
        const candidates = [];
        let numSyncedFullNodes = 0;
        for (const /** @type {BaseConsensusAgent} */ agent of this._agents.valueIterator()) {
            if (!agent.synced) {
                candidates.push(agent);
            } else if (Services.isFullNode(agent.peer.peerAddress.services)) {
                numSyncedFullNodes++;
            }
        }

        // Report consensus-lost if we are synced with less than the minimum number of full nodes or have no connections at all.
        if (this._established && (numSyncedFullNodes < BaseConsensus.MIN_FULL_NODES || this._agents.length === 0)) {
            this._established = false;
            this.fire('lost');
        }

        // Wait for ongoing sync to finish.
        if (this._syncPeer) {
            return;
        }

        // Choose a random peer which we aren't sync'd with yet.
        const agent = ArrayUtils.randomElement(candidates);
        if (!agent) {
            // We are synced with all connected peers.

            // Report consensus-established if we are connected to the minimum number of full nodes.
            if (numSyncedFullNodes >= BaseConsensus.MIN_FULL_NODES) {
                if (!this._established) {
                    Log.i(BaseConsensus, `Synced with all connected peers (${this._agents.length}), consensus established.`);
                    Log.d(BaseConsensus, `Blockchain: height=${this._blockchain.height}, headHash=${this._blockchain.headHash}`);

                    // Report consensus-established.
                    this._established = true;
                    this.fire('established');

                    // Allow inbound network connections after establishing consensus.
                    this._network.allowInboundConnections = true;
                }
            }
            // Otherwise, wait until more peer connections are established.
            else {
                this.fire('waiting');
            }

            return;
        }

        this._syncPeer = agent.peer;

        // Notify listeners when we start syncing and have not established consensus yet.
        if (!this._established) {
            this.fire('syncing');
        }

        Log.v(BaseConsensus, `Syncing blockchain with peer ${agent.peer.peerAddress}`);
        agent.syncBlockchain().catch(Log.w.tag(BaseConsensusAgent));
    }

    /**
     * @param {Peer} peer
     * @protected
     */
    _onPeerSynced(peer) {
        // Reset syncPeer if we finished syncing with it.
        if (peer.equals(this._syncPeer)) {
            Log.v(BaseConsensus, `Finished sync with peer ${peer.peerAddress}`);
            this._syncPeer = null;
        }
        this._syncBlockchain();
    }

    /**
     * @param {Peer} peer
     * @protected
     */
    _onPeerOutOfSync(peer) {
        Log.w(BaseConsensus, `Peer ${peer.peerAddress} out of sync, resyncing`);
        this._syncBlockchain();
    }

    /**
     * @param {Block} head
     * @protected
     */
    _onHeadChanged(head) {
        // Don't announce head changes if we are not synced yet.
        if (!this._established) return;

        for (const agent of this._agents.valueIterator()) {
            agent.relayBlock(head);
        }
    }

    /**
     * @param {Hash} blockHash
     * @param {Array.<Block>} revertBlocks
     * @param {Array.<Block>} forkBlocks
     * @private
     */
    async _onRebranched(blockHash, revertBlocks, forkBlocks) {
        await this.fire('head-changed', blockHash, 'rebranched', revertBlocks, forkBlocks);
    }

    /**
     * @param {Block} block
     * @private
     */
    async _onExtended(block) {
        await this.fire('head-changed', block.hash(), 'extended', [], [block]);
    }

    /**
     * @param {Transaction} tx
     * @protected
     */
    async _onTransactionAdded(tx) {
        // Don't relay transactions if we are not synced yet.
        if (!this._established) return;

        for (const agent of this._agents.valueIterator()) {
            agent.relayTransaction(tx);
        }
    }

    /**
     * @param {Transaction} tx
     * @protected
     */
    async _onTransactionRemoved(tx) {
        for (const agent of this._agents.valueIterator()) {
            agent.removeTransaction(tx);
        }
    }

    /**
     * @param {Hash} blockHashToProve
     * @param {number} blockHeightToProve
     * @returns {Promise.<Block>}
     * @protected
     */
    async _requestBlockProof(blockHashToProve, blockHeightToProve) {
        /** @type {Block} */
        const knownBlock = await this._blockchain.getNearestBlockAt(blockHeightToProve, /*lower*/ false);
        if (!knownBlock) {
            throw new Error('No suitable reference block found for BlockProof');
        }

        if (blockHashToProve.equals(knownBlock.hash())) {
            return knownBlock;
        }

        const agents = [];
        for (const agent of this._agents.valueIterator()) {
            const requiresHistory = blockHeightToProve < this._blockchain.height - Policy.NUM_BLOCKS_VERIFICATION ||
                knownBlock.height < this._blockchain.height - Policy.NUM_BLOCKS_VERIFICATION;
            if (agent.synced && agent.providesServices(Services.BLOCK_PROOF) && (!requiresHistory || agent.providesServices(Services.BLOCK_HISTORY))) {
                agents.push(agent);
            }
        }

        // Try agents first that (we think) know the reference block hash.
        const knownBlockHash = knownBlock.hash();
        agents.sort((a, b) =>
            b.knowsBlock(knownBlockHash) !== a.knowsBlock(knownBlockHash)
                ? -a.knowsBlock(knownBlockHash) + 0.5
                : Math.random() - 0.5);

        for (const /** @type {BaseConsensusAgent} */ agent of agents) {
            try {
                return await agent.getBlockProof(blockHashToProve, knownBlock); // eslint-disable-line no-await-in-loop
            } catch (e) {
                Log.w(BaseConsensus, `Failed to retrieve block proof for ${blockHashToProve}@${blockHeightToProve} from ${agent.peer.peerAddress}: ${e && e.message || e}`);
                // Try the next peer.
            }
        }

        // No peer supplied the requested account, fail.
        throw new Error(`Failed to retrieve block proof for ${blockHashToProve}`);
    }

    /**
     * @param {number} blockHeightToProve
     * @returns {Promise.<Block>}
     * @protected
     */
    async _requestBlockProofAt(blockHeightToProve) {
        /** @type {Block} */
        const knownBlock = await this._blockchain.getNearestBlockAt(blockHeightToProve, /*lower*/ false);
        if (!knownBlock) {
            throw new Error('No suitable reference block found for BlockProof');
        }

        if (blockHeightToProve === knownBlock.height) {
            return knownBlock;
        }

        const agents = [];
        for (const agent of this._agents.valueIterator()) {
            const requiresHistory = blockHeightToProve < this._blockchain.height - Policy.NUM_BLOCKS_VERIFICATION ||
                knownBlock.height < this._blockchain.height - Policy.NUM_BLOCKS_VERIFICATION;
            if (agent.synced && agent.providesServices(Services.BLOCK_PROOF) && (!requiresHistory || agent.providesServices(Services.BLOCK_HISTORY)) && agent.peer.version >= 2) {
                agents.push(agent);
            }
        }

        // Try agents first that (we think) know the reference block hash.
        const knownBlockHash = knownBlock.hash();
        agents.sort((a, b) =>
            b.knowsBlock(knownBlockHash) !== a.knowsBlock(knownBlockHash)
                ? -a.knowsBlock(knownBlockHash) + 0.5
                : Math.random() - 0.5);

        for (const /** @type {BaseConsensusAgent} */ agent of agents) {
            try {
                return await agent.getBlockProofAt(blockHeightToProve, knownBlock); // eslint-disable-line no-await-in-loop
            } catch (e) {
                Log.w(BaseConsensus, `Failed to retrieve block proof at ${blockHeightToProve} from ${agent.peer.peerAddress}: ${e && e.message || e}`);
                // Try the next peer.
            }
        }

        // No peer supplied the requested account, fail.
        throw new Error(`Failed to retrieve block proof at ${blockHeightToProve}`);
    }

    /**
     * @param {Array.<Address>} addresses
     * @param {Block} [block]
     * @returns {Promise.<Array<Transaction>>}
     * @protected
     */
    async _requestTransactionsByAddress(addresses, block = this._blockchain.head) {
        if (addresses.length === 0) {
            return [];
        }

        const agents = [];
        for (const agent of this._agents.valueIterator()) {
            const requiresHistory = block.height < this._blockchain.height - Policy.NUM_BLOCKS_VERIFICATION;
            if (agent.synced && agent.providesServices(Services.BODY_PROOF) && (!requiresHistory || agent.providesServices(Services.BLOCK_HISTORY))) {
                agents.push(agent);
            }
        }

        // Try agents first that (we think) know the reference block hash.
        const blockHash = block.hash();
        agents.sort((a, b) =>
            b.knowsBlock(blockHash) !== a.knowsBlock(blockHash)
                ? -a.knowsBlock(blockHash) + 0.5
                : Math.random() - 0.5);

        for (const /** @type {BaseConsensusAgent} */ agent of agents) {
            try {
                return await agent.getTransactionsProofByAddress(block, addresses); // eslint-disable-line no-await-in-loop
            } catch (e) {
                Log.w(BaseConsensus, `Failed to retrieve transactions proof for ${addresses} from ${agent.peer.peerAddress}: ${e && e.message || e}`);
                // Try the next peer.
            }
        }

        // No peer supplied the requested proof, fail.
        throw new Error(`Failed to retrieve transactions proof for ${addresses}`);
    }

    /**
     * @param {Address} address
     * @returns {Promise.<Array.<TransactionReceipt>>}
     * @protected
     */
    async _requestTransactionReceiptsByAddress(address) {
        const agents = [];
        for (const agent of this._agents.valueIterator()) {
            if (agent.synced && agent.providesServices(Services.TRANSACTION_INDEX)) {
                agents.push(agent);
            }
        }
        agents.sort(() => Math.random() - 0.5);

        for (const /** @type {BaseConsensusAgent} */ agent of agents) {
            try {
                return await agent.getTransactionReceiptsByAddress(address); // eslint-disable-line no-await-in-loop
            } catch (e) {
                Log.w(BaseConsensus, `Failed to retrieve transaction receipts for ${address} from ${agent.peer.peerAddress}: ${e && e.message || e}`);
                // Try the next peer.
            }
        }

        // No peer supplied the requested receipts, fail.
        throw new Error(`Failed to retrieve transaction receipts for ${address}`);
    }

    /**
     * @param {Address} address
     * @returns {Promise.<Array.<{transaction: Transaction, header: BlockHeader}>>}
     * @protected
     */
    async _requestTransactionHistory(address) {
        // 1. Get transaction receipts.
        const receipts = await this._requestTransactionReceiptsByAddress(address);

        // 2. Request proofs for missing blocks.
        /** @type {Array.<Promise.<Block>>} */
        const blockRequests = [];
        let lastBlockHash = null;
        for (const receipt of receipts) {
            if (!receipt.blockHash.equals(lastBlockHash)) {
                // eslint-disable-next-line no-await-in-loop
                const block = await this._blockchain.getBlock(receipt.blockHash);
                if (block) {
                    blockRequests.push(Promise.resolve(block));
                } else {
                    const request = this._requestBlockProof(receipt.blockHash, receipt.blockHeight)
                        .catch(e => Log.e(BaseConsensus, `Failed to retrieve proof for block ${receipt.blockHash}`
                            + ` (${e}) - transaction history may be incomplete`));
                    blockRequests.push(request);
                }

                lastBlockHash = receipt.blockHash;
            }
        }
        const blocks = await Promise.all(blockRequests);

        // 3. Request transaction proofs.
        const transactionRequests = [];
        for (const block of blocks) {
            if (!block) continue;

            const request = this._requestTransactionsByAddress([address], block)
                .then(txs => txs.map(tx => ({ transaction: tx, header: block.header })))
                .catch(e => Log.e(BaseConsensus, `Failed to retrieve transactions for block ${block.hash()}`
                    + ` (${e}) - transaction history may be incomplete`));
            transactionRequests.push(request);
        }

        const transactions = await Promise.all(transactionRequests);
        return transactions
            .reduce((flat, it) => it ? flat.concat(it) : flat, [])
            .sort((a, b) => a.header.height - b.header.height);
    }

    /** @type {boolean} */
    get established() {
        return this._established;
    }

    /** @type {Network} */
    get network() {
        return this._network;
    }

    /** @type {InvRequestManager} */
    get invRequestManager() {
        return this._invRequestManager;
    }
}
BaseConsensus.MAX_ATTEMPTS_TO_FETCH = 5;
BaseConsensus.SYNC_THROTTLE = 1500; // ms
BaseConsensus.MIN_FULL_NODES = 1;
BaseConsensus.TRANSACTION_RELAY_TIMEOUT = 10000;
BaseConsensus.SendTransactionResult = {
    REJECTED_LOCAL: -4,
    EXPIRED: -3,
    ALREADY_MINED: -2,
    INVALID: -1,
    NONE: 0,
    RELAYED: 1,
    KNOWN: 2,
    PENDING_LOCAL: 3,
};
Class.register(BaseConsensus);
