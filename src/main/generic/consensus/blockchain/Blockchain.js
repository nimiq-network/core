class Blockchain extends Observable {
    static getPersistent(accounts) {
        const store = BlockchainStore.getPersistent();
        return new Blockchain(store, accounts);
    }

    static createVolatile(accounts, allowCheckpoint=false) {
        const store = BlockchainStore.createVolatile();
        return new Blockchain(store, accounts, allowCheckpoint);
    }

    constructor(store, accounts, allowCheckpoint=true) {
        super();
        this._store = store;
        this._accounts = accounts;

        this._mainChain = null;
        this._mainPath = null;
        this._headHash = null;

        this._checkpointLoaded = false;

        // Blocks arriving fast over the network will create a backlog of blocks
        // in the synchronizer queue. Tell listeners when the blockchain is
        // ready to accept blocks again.
        this._synchronizer = new Synchronizer();
        this._synchronizer.on('work-end', () => this.fire('ready', this));

        return this._init(allowCheckpoint);
    }

    async _init(allowCheckpoint) {
        // Load the main chain from storage.
        this._mainChain = await this._store.getMainChain();

        // If we don't know any chains, start with the genesis chain.
        if (!this._mainChain) {
            this._mainChain = new Chain(Block.GENESIS);
            await this._store.put(this._mainChain);
            await this._store.setMainChain(this._mainChain);
            // Allow to load checkpoint if it exists and can be applied.
            if (allowCheckpoint && Block.CHECKPOINT && (await this.loadCheckpoint())) {
                this._mainChain = new Chain(Block.CHECKPOINT, Block.CHECKPOINT.TOTAL_WORK, Block.CHECKPOINT.height);
                await this._store.put(this._mainChain);
                await this._store.setMainChain(this._mainChain);
            }
        } else {
            // Fast-forward to CHECKPOINT if necessary.
            if (allowCheckpoint && Block.CHECKPOINT && this._mainChain.height < Block.CHECKPOINT.height && (await this.loadCheckpoint())) {
                this._mainChain = new Chain(Block.CHECKPOINT, Block.CHECKPOINT.TOTAL_WORK, Block.CHECKPOINT.height);
                await this._store.put(this._mainChain);
                await this._store.setMainChain(this._mainChain);
            }
        }

        // Cache the hash of the head of the current main chain.
        this._headHash = await this._mainChain.hash();

        // Fetch the path along the main chain.
        // XXX optimize this!
        this._mainPath = await this._fetchPath(this.head);

        // Always set checkpointLoaded to true, if our first block in the path is a checkpoint.
        if (this._mainPath.length > 0 && (this._mainPath[0].equals(Block.CHECKPOINT.HASH) || Block.OLD_CHECKPOINTS.indexOf(this._mainPath[0]))) {
            this._checkpointLoaded = true;
        }

        // Automatically commit the chain head if the accountsHash matches.
        // Needed to bootstrap the empty accounts tree.
        const accountsHash = await this.accountsHash();
        if (accountsHash.equals(Accounts.EMPTY_TREE_HASH)) {
            await this._accounts.commitBlock(this._mainChain.head);
        } else if (!accountsHash.equals(this._mainChain.head.accountsHash)) {
            // TODO what to do if the accounts hashes mismatch?
            throw 'AccountsHash mismatch';
        }

        return this;
    }

    async loadCheckpoint() {
        const accounts = await Accounts.createVolatile();

        // Load accountsTree at checkpoint.
        if (!AccountsTree.CHECKPOINT_NODES) {
            return false;
        }
        const nodes = AccountsTree.CHECKPOINT_NODES;
        // Read nodes.
        for (let i = 0; i < nodes.length; ++i) {
            nodes[i] = AccountsTreeNode.unserialize(BufferUtils.fromBase64(nodes[i]));
        }

        if (nodes.length === 0) {
            Log.d(Blockchain, 'Loading checkpoint failed, no nodes in AccountsTree.');
            return false;
        }

        // Check accountsHash.
        if (!(await nodes[0].hash()).equals(await Block.CHECKPOINT.accountsHash)) {
            Log.d(Blockchain, 'Loading checkpoint failed, accountsHash mismatch.');
            return false;
        }

        // Try populating the tree.
        if (!(await accounts.populate(nodes))) {
            Log.d(Blockchain, 'Loading checkpoint failed, tree could not be populated.');
            return false;

        }

        await this._accounts.clear();
        await this._accounts.populate(nodes);

        this._checkpointLoaded = true;
        return true;
    }

    // Retrieves up to maxBlocks predecessors of the given block.
    // Returns an array of max (maxBlocks + 1) block hashes with the given hash
    // as the last element.
    async _fetchPath(block, maxBlocks = 1000000) {
        let hash = await block.hash();
        const path = [hash];

        if (Block.GENESIS.HASH.equals(hash) || (this._checkpointLoaded && Block.CHECKPOINT.HASH.equals(hash))) {
            return new IndexedArray(path);
        }

        do {
            const prevChain = await this._store.get(block.prevHash.toBase64()); // eslint-disable-line no-await-in-loop
            if (!prevChain && Block.CHECKPOINT.HASH.equals(hash)) break;
            if (!prevChain && Block.OLD_CHECKPOINTS.indexOf(hash) >= 0) break; // we also need to stop if we encountered an old checkpoint
            if (!prevChain) throw `Failed to find predecessor block ${block.prevHash.toBase64()}`;

            // TODO unshift() is inefficient. We should build the array with push()
            // instead and iterate over it in reverse order.
            path.unshift(block.prevHash);

            // Advance to the predecessor block.
            hash = block.prevHash;
            block = prevChain.head;
        } while (--maxBlocks > 0 && !Block.GENESIS.HASH.equals(hash));

        return new IndexedArray(path);
    }

    pushBlock(block) {
        return new Promise((resolve, error) => {
            this._synchronizer.push(() => {
                return this._pushBlock(block);
            }, resolve, error);
        });
    }

    createTemporaryAccounts() {
        return Accounts.createTemporary(this._accounts);
    }

    async _pushBlock(block) {
        // Check if we already know this block. If so, ignore it.
        const hash = await block.hash();
        const knownChain = await this._store.get(hash.toBase64());
        if (knownChain && !this._isHarderChain(knownChain, hash)) {
            Log.v(Blockchain, `Ignoring known block ${hash.toBase64()}`);
            return Blockchain.PUSH_ERR_KNOWN_BLOCK;
        }

        // Retrieve the previous block. Fail if we don't know it.
        const prevChain = await this._store.get(block.prevHash.toBase64());
        if (!prevChain) {
            Log.v(Blockchain, `Discarding block ${hash.toBase64()} - previous block ${block.prevHash.toBase64()} unknown`);
            return Blockchain.PUSH_ERR_ORPHAN_BLOCK;
        }

        // Check all intrinsic block invariants.
        if (!(await this._verifyBlock(block))) {
            return Blockchain.PUSH_ERR_INVALID_BLOCK;
        }

        // Check that the block is a valid extension of its previous block.
        if (!(await this._isValidExtension(prevChain, block))) {
            return Blockchain.PUSH_ERR_INVALID_BLOCK;
        }

        // Block looks good, compute the new total work & height.
        const totalWork = prevChain.totalWork + block.difficulty;
        const height = prevChain.height + 1;

        // Store the new block.
        let newChain = knownChain;
        if (!knownChain) {
            newChain = new Chain(block, totalWork, height);
            await this._store.put(newChain);
        }

        // Check if the new block extends our current main chain.
        if (block.prevHash.equals(this._headHash)) {
            // Append new block to the main chain.
            if (!(await this._extend(newChain, hash))) {
                return Blockchain.PUSH_ERR_INVALID_BLOCK;
            }

            // Tell listeners that the head of the chain has changed.
            this.fire('head-changed', this.head);

            return Blockchain.PUSH_OK;
        }

        // Otherwise, check if the new chain is harder than our current main chain:
        if (this._isHarderChain(newChain, hash)) {
            // A fork has become the hardest chain, rebranch to it.
            await this._rebranch(newChain, hash);

            // Tell listeners that the head of the chain has changed.
            this.fire('head-changed', this.head);

            return Blockchain.PUSH_OK;
        }

        // Otherwise, we are creating/extending a fork. We have stored the block,
        // the head didn't change, nothing else to do.
        Log.v(Blockchain, `Creating/extending fork with block ${hash.toBase64()}, height=${newChain.height}, totalWork=${newChain.totalWork}`);

        return Blockchain.PUSH_OK;
    }

    _isHarderChain(newChain, headHash) {
        // - Pick chain with higher total work.
        // - If identical, pick chain with higher timestamp.
        // - If identical as well, pick chain with lower PoW hash.
        let isHarderChain = false;
        if (newChain.totalWork > this.totalWork) {
            isHarderChain = true;
        } else if (newChain.totalWork === this.totalWork) {
            if (newChain.head.timestamp > this.head.timestamp) {
                isHarderChain = true;
            } else if (newChain.head.timestamp === this.head.timestamp
                && parseInt(headHash.toHex(), 16) < parseInt(this.headHash.toHex(), 16)) {
                isHarderChain = true;
            }
        }
        return isHarderChain;
    }

    async _verifyBlock(block) {
        // Check that the maximum block size is not exceeded.
        if (block.serializedSize > Policy.BLOCK_SIZE_MAX) {
            Log.w(Blockchain, 'Rejected block - max block size exceeded');
            return false;
        }

        // XXX Check that there is only one transaction per sender per block.
        const senderPubKeys = {};
        for (const tx of block.body.transactions) {
            if (senderPubKeys[tx.senderPubKey]) {
                Log.w(Blockchain, 'Rejected block - more than one transaction per sender');
                return false;
            }
            if (tx.recipientAddr.equals(await tx.getSenderAddr())) {  // eslint-disable-line no-await-in-loop
                Log.w(Blockchain, 'Rejected block - sender and recipient coincide');
                return false;
            }
            senderPubKeys[tx.senderPubKey] = true;
        }

        // Verify that the block's timestamp is not too far in the future.
        // TODO Use network-adjusted time (see https://en.bitcoin.it/wiki/Block_timestamp).
        const maxTimestamp = Math.floor((Date.now() + Blockchain.BLOCK_TIMESTAMP_DRIFT_MAX) / 1000);
        if (block.header.timestamp > maxTimestamp) {
            Log.w(Blockchain, 'Rejected block - timestamp too far in the future');
            return false;
        }

        // Check that the headerHash matches the difficulty.
        if (!(await block.header.verifyProofOfWork())) {
            Log.w(Blockchain, 'Rejected block - PoW verification failed');
            return false;
        }

        // Check that header bodyHash matches the actual bodyHash.
        const bodyHash = await block.body.hash();
        if (!block.header.bodyHash.equals(bodyHash)) {
            Log.w(Blockchain, 'Rejecting block - body hash mismatch');
            return false;
        }
        // Check that all transaction signatures are valid.
        for (const tx of block.body.transactions) {
            if (!(await tx.verifySignature())) { // eslint-disable-line no-await-in-loop
                Log.w(Blockchain, 'Rejected block - invalid transaction signature');
                return false;
            }
        }

        // Everything checks out.
        return true;
    }

    async _isValidExtension(chain, block) {
        // Check that the height is one higher than previous
        if (chain.height !== block.header.height - 1) {
            Log.w(Blockchain, 'Rejecting block - not next in height');
            return false;
        }

        // Check that the difficulty matches.
        const nextCompactTarget = await this.getNextCompactTarget(chain);
        if (nextCompactTarget !== block.nBits) {
            Log.w(Blockchain, 'Rejecting block - difficulty mismatch');
            return false;
        }

        // Check that the timestamp is after (or equal) the previous block's timestamp.
        if (chain.head.timestamp > block.timestamp) {
            Log.w(Blockchain, 'Rejecting block - timestamp mismatch');
            return false;
        }

        // Everything checks out.
        return true;
    }

    async _extend(newChain, headHash) {
        // Validate that the block matches the current account state.
        try {
            await this._accounts.commitBlock(newChain.head);
        } catch (e) {
            // AccountsHash mismatch. This can happen if someone gives us an
            // invalid block. TODO error handling
            Log.w(Blockchain, `Rejecting block, AccountsHash mismatch: bodyHash=${newChain.head.bodyHash}, accountsHash=${newChain.head.accountsHash}`);
            return false;
        }

        // Update main chain.
        this._mainChain = newChain;
        this._mainPath.push(headHash);
        this._headHash = headHash;
        await this._store.setMainChain(this._mainChain);

        return true;
    }

    async _revert() {
        // Load the predecessor chain.
        const prevHash = this.head.prevHash;
        const prevChain = await this._store.get(prevHash.toBase64());
        if (!prevChain) throw `Failed to find predecessor block ${prevHash.toBase64()} while reverting`;

        // Test first
        const tmpAccounts = await this.createTemporaryAccounts();
        await tmpAccounts.revertBlock(this.head);
        const tmpHash = await tmpAccounts.hash();
        Log.d(Blockchain, `AccountsHash after revert: ${tmpHash}`);
        if (!tmpHash.equals(prevChain.head.accountsHash)) {
            throw 'Failed to revert main chain - inconsistent state';
        }

        // Revert the head block of the main chain.
        await this._accounts.revertBlock(this.head);

        // Update main chain.
        this._mainChain = prevChain;
        this._mainPath.pop();
        this._headHash = prevHash;
        await this._store.setMainChain(this._mainChain);

        // XXX Sanity check: Assert that the accountsHash now matches the
        // accountsHash of the current head.
        const accountsHash = await this.accountsHash();
        Log.d(Blockchain, `AccountsHash after revert: ${accountsHash}`);

        if (!accountsHash.equals(this.head.accountsHash)) {
            throw 'Failed to revert main chain - inconsistent state';
        }
    }

    async _rebranch(newChain, headHash) {
        Log.v(Blockchain, `Rebranching to fork ${headHash}, height=${newChain.height}, totalWork=${newChain.totalWork}`);

        // Find the common ancestor between our current main chain and the fork chain.
        // Walk up the fork chain until we find a block that is part of the main chain.
        // Store the chain along the way. In the worst case, this walks all the way
        // up to the genesis block.
        let forkHead = newChain.head;
        const forkChain = [newChain];
        while (this._mainPath.indexOf(forkHead.prevHash) < 0) {
            const prevChain = await this._store.get(forkHead.prevHash.toBase64()); // eslint-disable-line no-await-in-loop
            if (!prevChain) throw `Failed to find predecessor block ${forkHead.prevHash.toBase64()} while rebranching`;

            forkHead = prevChain.head;
            forkChain.unshift(prevChain);
        }

        // The predecessor of forkHead is the desired common ancestor.
        const commonAncestor = forkHead.prevHash;

        Log.v(Blockchain, `Found common ancestor ${commonAncestor.toBase64()} ${forkChain.length} blocks up`);

        // Revert all blocks on the current main chain until the common ancestor.
        while (!this.headHash.equals(commonAncestor)) {
            await this._revert(); // eslint-disable-line no-await-in-loop
        }

        // We have reverted to the common ancestor state. Apply all blocks on
        // the fork chain until we reach the new head.
        for (const chain of forkChain) {
            // XXX optimize!
            const hash = await chain.hash(); // eslint-disable-line no-await-in-loop
            await this._extend(chain, hash); // eslint-disable-line no-await-in-loop
        }
    }

    async getBlock(hash) {
        const chain = await this._store.get(hash.toBase64());
        return chain ? chain.head : null;
    }

    async getNextCompactTarget(chain) {
        chain = chain || this._mainChain;

        // The difficulty is adjusted every DIFFICULTY_ADJUSTMENT_BLOCKS blocks.
        if (chain.height % Policy.DIFFICULTY_ADJUSTMENT_BLOCKS === 0) {
            // If the given chain is the main chain, get the last DIFFICULTY_ADJUSTMENT_BLOCKS
            // blocks via this._mainChain, otherwise fetch the path.
            let startHash;
            if (chain === this._mainChain) {
                const startHeight = Math.max(this._mainPath.length - Policy.DIFFICULTY_ADJUSTMENT_BLOCKS, 0);
                startHash = this._mainPath[startHeight];
            } else {
                const path = await this._fetchPath(chain.head, Policy.DIFFICULTY_ADJUSTMENT_BLOCKS - 1);
                startHash = path[0];
            }

            // Compute the actual time it took to mine the last DIFFICULTY_ADJUSTMENT_BLOCKS blocks.
            const startChain = await this._store.get(startHash.toBase64());
            const actualTime = chain.head.timestamp - startChain.head.timestamp;

            // Compute the target adjustment factor.
            const expectedTime = Policy.DIFFICULTY_ADJUSTMENT_BLOCKS * Policy.BLOCK_TIME;
            let adjustment = actualTime / expectedTime;

            // Clamp the adjustment factor to [0.25, 4].
            adjustment = Math.max(adjustment, 0.25);
            adjustment = Math.min(adjustment, 4);

            // Compute the next target.
            const currentTarget = chain.head.target;
            let nextTarget = currentTarget * adjustment;

            // Make sure the target is below or equal the maximum allowed target (difficulty 1).
            // Also enforce a minimum target of 1.
            nextTarget = Math.min(nextTarget, Policy.BLOCK_TARGET_MAX);
            nextTarget = Math.max(nextTarget, 1);

            return BlockUtils.targetToCompact(nextTarget);
        }

        // If the difficulty is not adjusted at this height, the next difficulty
        // is the current difficulty.
        return chain.head.nBits;
    }

    get head() {
        return this._mainChain.head;
    }

    get totalWork() {
        return this._mainChain.totalWork;
    }

    get height() {
        return this._mainChain.height;
    }

    get headHash() {
        return this._headHash;
    }

    get path() {
        return this._mainPath;
    }

    get busy() {
        return this._synchronizer.working;
    }

    get checkpointLoaded() {
        return this._checkpointLoaded;
    }

    accountsHash() {
        return this._accounts.hash();
    }

    async exportMainPath(height) {
        height = height || this.head.height;
        const blocks = {};
        const path = [];

        for (let i = 0; i < this._mainPath.length; ++i) {
            const blockHash = this._mainPath[i];
            const block = await this.getBlock(blockHash);
            if (block.height > height) break;
            path.push(blockHash.toBase64());
            blocks[blockHash] = BufferUtils.toBase64(block.serialize());
        }

        return {
            'path': path,
            'blocks': blocks
        };
    }

    async exportAccounts(height) {
        height = height || this.head.height;
        const accounts = await Accounts.createTemporary(this._accounts);

        let currentBlock = this.head;
        // Do not revert the block with the desired height!
        while (currentBlock.height > height) {
            await accounts.revertBlock(currentBlock);
            currentBlock = await this.getBlock(currentBlock.prevHash);
        }

        if (!currentBlock.accountsHash.equals(await accounts.hash())) {
            throw 'AccountsHash mismatch while exporting';
        }

        if (!accounts._tree.verify()) {
            throw 'AccountsTree verification failed';
        }

        return accounts.export();
    }
}
Blockchain.BLOCK_TIMESTAMP_DRIFT_MAX = 1000 * 60 * 15; // 15 minutes
Blockchain.PUSH_OK = 0;
Blockchain.PUSH_ERR_KNOWN_BLOCK = 1;
Blockchain.PUSH_ERR_INVALID_BLOCK = -1;
Blockchain.PUSH_ERR_ORPHAN_BLOCK = -2;
Class.register(Blockchain);

class Chain {
    constructor(head, totalWork, height = 1) {
        this._head = head;
        this._totalWork = totalWork ? totalWork : head.difficulty;
        this._height = height;
    }

    static unserialize(buf) {
        const head = Block.unserialize(buf);
        const totalWork = buf.readFloat64();
        const height = buf.readUint32();
        return new Chain(head, totalWork, height);
    }

    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        this._head.serialize(buf);
        buf.writeFloat64(this._totalWork);
        buf.writeUint32(this._height);
        return buf;
    }

    get serializedSize() {
        return this._head.serializedSize
            + /*totalWork*/ 8
            + /*height*/ 4;
    }

    get head() {
        return this._head;
    }

    get totalWork() {
        return this._totalWork;
    }

    get height() {
        return this._height;
    }

    hash() {
        return this._head.hash();
    }
}
Class.register(Chain);
