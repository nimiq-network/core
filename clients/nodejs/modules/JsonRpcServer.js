const http = require('http');
const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');
const btoa = require('btoa');
const NodeUtils = require('./NodeUtils.js');
const Nimiq = require('../../../dist/node.js');
const WebSocket = require('ws');


class JsonRpcServer {
    /**
     * @param {{port: number, corsdomain: string|Array.<string>, username: ?string, password: ?string, allowip: string|Array.<string>, methods: ?Array.<string>}} config
     * @param {{enabled: boolean, threads: number, throttleAfter: number, throttleWait: number, extraData: string}} minerConfig
     * @param {{enabled: boolean, host: string, port: number, mode: string}} poolConfig
     */
    constructor(config, minerConfig, poolConfig) {
        this._config = config;
        this._minerConfig = minerConfig;
        this._poolConfig = poolConfig;

        if (typeof config.corsdomain === 'string') config.corsdomain = [config.corsdomain];
        if (!config.corsdomain) config.corsdomain = [];
        if (typeof config.allowip === 'string') config.allowip = [config.allowip];
        if (!config.allowip) config.allowip = [];

        const server = http.createServer((req, res) => {
            // Block requests that might originate from a website in the users browser,
            // unless the origin is explicitly whitelisted.
            if (config.corsdomain.includes(req.headers.origin)) {
                res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
                res.setHeader('Access-Control-Allow-Methods', 'POST');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                res.setHeader('Access-Control-Max-Age', '900');
            } else if (req.headers.origin || req.headers.referer) {
                res.writeHead(403, `Access not allowed from ${req.headers.origin || req.headers.referer}`);
                res.end();
                return;
            }

            // Deny IP addresses other than local if not explicitly allowed.
            const remoteIp = req.connection.remoteAddress;
            if (!Nimiq.NetUtils.isLocalIP(remoteIp)) { // Not local host
                let found = false;
                for (const subnet of config.allowip) {
                    found |= Nimiq.NetUtils.isIPv4inSubnet(remoteIp, subnet);
                }
                if (!found) {
                    res.writeHead(403);
                    res.end();
                    return;
                }
            }

            if (req.method === 'GET') {
                res.writeHead(200);
                res.end('Nimiq JSON-RPC Server\n');
            } else if (req.method === 'POST') {
                if (JsonRpcServer._authenticate(req, res, config.username, config.password)) {
                    this._onRequest(req, res);
                }
            } else {
                res.writeHead(200);
                res.end();
            }
        });
        server.listen(config.port, config.allowip.length ? '0.0.0.0' : '127.0.0.1');
        
        this._ws = new WebSocket.Server({ server: server, path: '/' });

        //Handle connections
        this._ws.on('connection', (ws) =>{
            this._onWebsocketConnection(ws)
        });

        Nimiq.Log.i(JsonRpcServer, `RPC server listening on ${config.port}`);
        /** @type {Map.<string, function(*)>} */
        this._methods = new Map();

        /** @type {Client.ConsensusState} */
        this._consensusState = Nimiq.Client.ConsensusState.SYNCING;
    }

    /**
     * @param {Client} client
     * @param {FullConsensus} consensus
     * @param {Miner|SmartPoolMiner|NanoPoolMiner} miner
     * @param {WalletStore} walletStore
     */
    async init(client, consensus, miner, walletStore) {
        /** @type {Client} */
        this._client = client;
        this._consensus = consensus; // TODO: Required for minFeePerByte
        this._miner = miner;
        this._walletStore = walletStore;

        this._startingBlock = await this._client.getHeadHeight();
        await this._client.addConsensusChangedListener((state) => {
            this._consensusState = state;
        });

        // Network
        this._methods.set('peerCount', this.peerCount.bind(this));
        this._methods.set('syncing', this.syncing.bind(this));
        this._methods.set('consensus', this.consensus.bind(this));
        this._methods.set('peerList', this.peerList.bind(this));
        this._methods.set('peerState', this.peerState.bind(this));

        // Transactions
        this._methods.set('sendRawTransaction', this.sendRawTransaction.bind(this));
        this._methods.set('createRawTransaction', this.createRawTransaction.bind(this));
        this._methods.set('sendTransaction', this.sendTransaction.bind(this));
        this._methods.set('getRawTransactionInfo', this.getRawTransactionInfo.bind(this));
        this._methods.set('getTransactionByBlockHashAndIndex', this.getTransactionByBlockHashAndIndex.bind(this));
        this._methods.set('getTransactionByBlockNumberAndIndex', this.getTransactionByBlockNumberAndIndex.bind(this));
        this._methods.set('getTransactionByHash', this.getTransactionByHash.bind(this));
        this._methods.set('getTransactionReceipt', this.getTransactionReceipt.bind(this));
        this._methods.set('getTransactionsByAddress', this.getTransactionsByAddress.bind(this));
        this._methods.set('mempoolContent', this.mempoolContent.bind(this));
        this._methods.set('mempool', this.mempool.bind(this));
        this._methods.set('minFeePerByte', this.minFeePerByte.bind(this));

        // Miner
        this._methods.set('mining', this.mining.bind(this));
        this._methods.set('hashrate', this.hashrate.bind(this));
        this._methods.set('minerThreads', this.minerThreads.bind(this));
        this._methods.set('minerAddress', this.minerAddress.bind(this));
        this._methods.set('pool', this.pool.bind(this));
        this._methods.set('poolConnectionState', this.poolConnectionState.bind(this));
        this._methods.set('poolConfirmedBalance', this.poolConfirmedBalance.bind(this));
        this._methods.set('getWork', this.getWork.bind(this));
        this._methods.set('getBlockTemplate', this.getBlockTemplate.bind(this));
        this._methods.set('submitBlock', this.submitBlock.bind(this));

        // Accounts
        this._methods.set('accounts', this.accounts.bind(this));
        this._methods.set('createAccount', this.createAccount.bind(this));
        this._methods.set('getBalance', this.getBalance.bind(this));
        this._methods.set('getAccount', this.getAccount.bind(this));

        // Blockchain
        this._methods.set('blockNumber', this.blockNumber.bind(this));
        this._methods.set('getBlockTransactionCountByHash', this.getBlockTransactionCountByHash.bind(this));
        this._methods.set('getBlockTransactionCountByNumber', this.getBlockTransactionCountByNumber.bind(this));
        this._methods.set('getBlockByHash', this.getBlockByHash.bind(this));
        this._methods.set('getBlockByNumber', this.getBlockByNumber.bind(this));

        this._methods.set('constant', this.constant.bind(this));
        this._methods.set('log', this.log.bind(this));

        const $ = {};
        $.blockchain = consensus.blockchain;
        $.accounts = $.blockchain.accounts;
        $.mempool = consensus.mempool;
        $.network = consensus.network;

        // $.network.on('*', (event, data) => {
        //     this.emitEvent(event, data);
        // });
        
        $.blockchain.on('*', async (event, ...data) => {
            switch(event){
                case 'head-changed':
                    data = await this._blockToObj(data[0], true);
                    break;
                case 'block':
                    data = data[0].toHex();
                    break;
                case 'rebranched':
                    data = {
                        revertBlocks: data[0].map((e) => this._blockToObj(e)),
                        forkBlocks: data[0].map((e) => this._blockToObj(e)), 
                        blockHash: data[2].toHex()
                    };
                    break;
                case 'extended':
                    data = {height: data[0].height};
                    break;
            }
            this.emitEvent('blockchain/'+event, data);
        });
        
        
        $.mempool.on('*', async (event, data) => {
            switch(event){
                case 'transaction-added':
                case 'transaction-removed':
                    data = await this._transactionToObj(data);
                    break;
            }
            this.emitEvent('mempool/'+event, data);
        });
        
        // Apply method whitelist if configured.
        if (this._config.methods && this._config.methods.length > 0) {
            const whitelist = new Set(this._config.methods);
            for (const method of this._methods.keys()) {
                if (!whitelist.has(method)) {
                    this._methods.delete(method);
                }
            }
        }
    }

    emitEvent(event, data){
        Nimiq.Log.i(JsonRpcServer,` Emitting Event: ${event}`);
        this._ws.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                  event,
                  data
              }));
            }
        });
    }

    /**
     * @param req
     * @param res
     * @param {?string} username
     * @param {?string} password
     * @returns {boolean}
     * @private
     */
    static _authenticate(req, res, username, password) {
        if (username && password && req.headers.authorization !== `Basic ${btoa(`${username}:${password}`)}`) {
            res.writeHead(401, {'WWW-Authenticate': 'Basic realm="Use user-defined username and password to access the JSON-RPC API." charset="UTF-8"'});
            res.end();
            return false;
        }
        return true;
    }

    /*
     * Network
     */

    async peerCount() {
        const stats = await this._client.network.getStatistics();
        return stats.totalPeerCount;
    }

    consensus() {
        return this._consensusState;
    }

    async syncing() {
        if (this._consensusState === Nimiq.Client.ConsensusState.ESTABLISHED) return false;
        const currentBlock = await this._client.getHeadHeight();
        const highestBlock = await this._client.getHeadHeight(); // TODO
        return {
            startingBlock: this._startingBlock,
            currentBlock: currentBlock,
            highestBlock: highestBlock
        };
    }

    async peerList() {
        const peers = [];
        const addresses = await this._client.network.getAddresses();
        const allPeers = await this._client.network.getPeers();

        for (const address of addresses) {
            peers.push(this._infoToPeerObj(allPeers.find(peer => peer.peerAddress.equals(address.peerAddress)), address));
        }
        return peers;
    }

    /**
     * @param {string} peer
     */
    async peerState(peer, set) {
        if (typeof set === 'string') {
            set = set.toLowerCase();
            switch (set) {
                case 'disconnect':
                    await this._client.network.disconnect(peer);
                    break;
                case 'ban':
                    await this._client.network.ban(peer);
                    break;
                case 'unban':
                    await this._client.network.unban(peer);
                    break;
                case 'connect':
                    await this._client.network.connect(peer);
                    break;
            }
        }
        return this._infoToPeerObj(await this._client.network.getPeer(peer), await this._client.network.getAddress(peer));
    }

    /*
     * Transactions
     */

    async sendRawTransaction(txHex) {
        const tx = Nimiq.Transaction.unserialize(Nimiq.BufferUtils.fromHex(txHex));
        const details = await this._client.sendTransaction(tx);
        switch (details.state) {
            case Nimiq.Client.TransactionState.INVALIDATED:
                throw new Error('Transaction invalid');
            case Nimiq.Client.TransactionState.EXPIRED:
                throw new Error('Transaction invalid');
        }
        return tx.hash().toHex();
    }

    async createRawTransaction(tx) {
        const flags = tx.flags ? Number.parseInt(tx.flags) : Nimiq.Transaction.Flag.NONE;
        const from = Nimiq.Address.fromString(tx.from);
        const signer = tx.signer ? Nimiq.Address.fromString(tx.signer) : from;
        const fromType = tx.fromType ? Number.parseInt(tx.fromType) : Nimiq.Account.Type.BASIC;
        const to = (!tx.to && flags == Nimiq.Transaction.Flag.CONTRACT_CREATION) ? Nimiq.Address.CONTRACT_CREATION : Nimiq.Address.fromString(tx.to);
        const toType = tx.toType ? Number.parseInt(tx.toType) : Nimiq.Account.Type.BASIC;
        const value = parseInt(tx.value);
        const fee = parseInt(tx.fee);
        const data = tx.data ? Nimiq.BufferUtils.fromHex(tx.data) : new Uint8Array(0);
        const validityStartHeight = tx.validityStartHeight ? Number.parseInt(tx.validityStartHeight) : (await this._client.getHeadHeight());
        /** @type {Wallet} */
        const wallet = await this._walletStore.get(signer);
        if (!wallet || !(wallet instanceof Nimiq.Wallet)) {
            throw new Error(`"${signer.toUserFriendlyAddress()}" can not sign transactions using this node.`);
        }
        let transaction;
        if (fromType !== Nimiq.Account.Type.BASIC || toType !== Nimiq.Account.Type.BASIC || data.length != 0) {
            let proof;
            if (fromType === Nimiq.Account.Type.HTLC) {
                if (!tx.proof) throw new Error('For transactions from HTLCs, proof data is required.');
                switch (tx.proof.type) {
                    case Nimiq.HashedTimeLockedContract.ProofType.REGULAR_TRANSFER: {
                        const hashAlgorithm = tx.proof.hashAlgorithm;
                        const hashDepth = tx.proof.hashDepth;
                        const hashRoot = Nimiq.Hash.fromAny(tx.proof.hashRoot, hashAlgorithm);
                        const preImage = Nimiq.Hash.fromAny(tx.proof.preImage, hashAlgorithm);

                        proof = new Nimiq.SerialBuffer(1 + 1 + 1 + 2 * Nimiq.Hash.SIZE.get(hashAlgorithm) + Nimiq.SignatureProof.SINGLE_SIG_SIZE);
                        proof.writeUint8(tx.proof.type);
                        proof.writeUint8(hashAlgorithm);
                        proof.writeUint8(hashDepth);
                        hashRoot.serialize(proof);
                        preImage.serialize(proof);
                        break;
                    }
                    case Nimiq.HashedTimeLockedContract.ProofType.TIMEOUT_RESOLVE: {
                        proof = new Nimiq.SerialBuffer(1 + Nimiq.SignatureProof.SINGLE_SIG_SIZE);
                        proof.writeUint8(tx.proof.type);
                        break;
                    }
                    default: throw new Error('Invalid proof type.');
                }
            } else {
                proof = new Nimiq.SerialBuffer(Nimiq.SignatureProof.SINGLE_SIG_SIZE);
            }
            transaction = new Nimiq.ExtendedTransaction(from, fromType, to, toType, value, fee, validityStartHeight, flags, data);
            Nimiq.SignatureProof.singleSig(wallet.publicKey, Nimiq.Signature.create(wallet.keyPair.privateKey, wallet.publicKey, transaction.serializeContent()))
                .serialize(proof);
            transaction.proof = proof;
        } else {
            transaction = wallet.createTransaction(to, value, fee, validityStartHeight);
        }
        return Nimiq.BufferUtils.toHex(transaction.serialize());
    }

    async sendTransaction(tx) {
        return this.sendRawTransaction(await this.createRawTransaction(tx));
    }

    async getRawTransactionInfo(txHex) {
        const tx = Nimiq.Transaction.unserialize(Nimiq.BufferUtils.fromHex(txHex));
        try {
            const liveTx = await this._getTransactionByHash(tx.hash());
            if (liveTx) {
                liveTx.valid = true;
                liveTx.inMempool = !liveTx.confirmations;
                return liveTx;
            }
        } catch (e) {
            // Ignore, the tx is not yet known
        }
        const txObj = await this._transactionToObj(tx);
        txObj.valid = await tx.verify();
        txObj.inMempool = false;
        return txObj;
    }

    async getTransactionByBlockHashAndIndex(blockHash, txIndex) {
        const block = await this._client.getBlock(Nimiq.Hash.fromString(blockHash), true);
        if (block && block.transactions.length > txIndex) {
            return this._transactionToObj(block.transactions[txIndex], block, txIndex);
        }
        return null;
    }

    async getTransactionByBlockNumberAndIndex(number, txIndex) {
        const block = await this._getBlockByNumber(number);
        if (block && block.transactions.length > txIndex) {
            return this._transactionToObj(block.transactions[txIndex], block, txIndex);
        }
        return null;
    }

    async getTransactionByHash(hash) {
        return this._getTransactionByHash(Nimiq.Hash.fromString(hash));
    }

    async _getTransactionByHash(hash, blockHash, blockHeight) {
        const tx = await this._client.getTransaction(hash, blockHash, blockHeight);
        if (tx) {
            return this._transactionDetailsToObj(tx);
        }
        return null;
    }

    async getTransactionReceipt(hash) {
        const receipt = await this._client.getTransactionReceipt(hash);
        if (!receipt) return null;
        const block = await this._client.getBlock(receipt.blockHash);
        return {
            transactionHash: receipt.transactionHash.toHex(),
            transactionIndex: block ? block.transactions.findIndex(tx => tx.hash().toHex() === hash) : undefined,
            blockNumber: receipt.blockHeight,
            blockHash: receipt.blockHash.toHex(),
            confirmations: (await this._client.getHeadHeight()) - receipt.blockHeight,
            timestamp: block ? block.timestamp : undefined
        };
    }

    async getTransactionsByAddress(addr, limit = 1000) {
        const address = Nimiq.Address.fromString(addr);
        const txs = await this._client.getTransactionsByAddress(address, 0, [], limit);
        const result = [];
        for (const tx of txs) {
            try {
                result.push(this._transactionDetailsToObj(tx));
            } catch (e) {
                Nimiq.Log.w(JsonRpcServer, `Transactions from receipt is not available`);
            }
            if (result.length >= limit) break;
        }
        return result;
    }

    async mempoolContent(includeTransactions) {
        return Promise.all((await this._client.mempool.getTransactions()).map(async (txHash) => {
            return includeTransactions ? this._transactionDetailsToObj(await this._client.getTransaction(txHash)) : txHash.toHex();
        }));
    }

    async mempool() {
        const stats = await this._client.mempool.getStatistics();
        const transactionsPerBucket = stats.countInBuckets;
        transactionsPerBucket.total = stats.count;
        return transactionsPerBucket;
    }

    minFeePerByte(minFeePerByte) {
        if (typeof minFeePerByte === 'number') {
            this._consensus.subscribeMinFeePerByte(minFeePerByte);
        }
        return this._consensus.minFeePerByte;
    }

    /*
     * Miner
     */

    mining(enabled) {
        if (enabled === true) {
            this._minerConfig.enabled = true;
            if (this._poolConfig.enabled && this._isPoolValid() && this._miner.isDisconnected()) {
                this._miner.connect(this._poolConfig.host, this._poolConfig.port);
            }
            if (!this._miner.working && this._consensusState === Nimiq.Client.ConsensusState.ESTABLISHED) this._miner.startWork();
        } else if (enabled === false) {
            this._minerConfig.enabled = false;
            if (this._miner.working) this._miner.stopWork();
            if (this._miner instanceof Nimiq.BasePoolMiner && !this._miner.isDisconnected()) {
                this._miner.disconnect();
            }
        }
        return this._minerConfig.enabled;
    }

    hashrate() {
        return this._miner.hashrate;
    }

    minerThreads(threads) {
        if (typeof threads === 'number') {
            this._miner.threads = threads;
            this._minerConfig.threads = threads;
        }
        return this._miner.threads;
    }

    minerAddress() {
        return this._miner.address.toUserFriendlyAddress();
    }

    pool(pool) {
        if (pool && !(this._miner instanceof Nimiq.BasePoolMiner)) {
            throw new Error('Client was not started with the pool miner option.');
        }
        if (typeof pool === 'string') {
            let [host, port] = pool.split(':');
            port = parseInt(port);
            if (!this._isPoolValid(host, port)) {
                throw new Error('Pool must be specified as `host:port`');
            }
            this._poolConfig.host = host;
            this._poolConfig.port = port;
            if (!this._miner.isDisconnected()) {
                // disconnect from old pool
                this._miner.disconnect();
            }
            pool = true;
        }

        if (pool === true) {
            if (!this._isPoolValid()) {
                throw new Error('No valid pool specified.');
            }
            this._poolConfig.enabled = true;
            if (this._miner.isDisconnected()) {
                this._miner.connect(this._poolConfig.host, this._poolConfig.port);
            }
        } else if (pool === false) {
            this._poolConfig.enabled = false;
            if (this._miner instanceof Nimiq.BasePoolMiner
                && !this._miner.isDisconnected()) {
                this._miner.disconnect();
            }
        }

        return this._poolConfig.enabled && this._isPoolValid(this._miner.host, this._miner.port)
            ? `${this._miner.host}:${this._miner.port}`
            : null;
    }

    poolConnectionState() {
        return typeof this._miner.connectionState !== 'undefined'
            ? this._miner.connectionState
            : Nimiq.BasePoolMiner.ConnectionState.CLOSED;
    }

    poolConfirmedBalance() {
        return this._miner.confirmedBalance || 0;
    }

    async getWork(addressStr, extraDataHex) {
        let address, extraData;
        try {
            address = Nimiq.Address.fromString(addressStr);
            extraData = Nimiq.BufferUtils.fromHex(extraDataHex);
        } catch (e) {}
        const block = await this._miner.getNextBlock(address, extraData);
        if (!block) {
            const e = new Error('Cannot create work template, check state before requesting work.');
            e.code = 501;
            throw e;
        }
        const shareCompact = this._miner.shareCompact || Nimiq.BlockUtils.targetToCompact(block.target);
        const blockSerialized = block.serialize();
        return {
            data: Nimiq.BufferUtils.toHex(blockSerialized.subarray(0, block.header.serializedSize)),
            suffix: Nimiq.BufferUtils.toHex(blockSerialized.subarray(block.header.serializedSize, blockSerialized.length)),
            target: shareCompact,
            algorithm: "nimiq-argon2"
        }
    }

    async getBlockTemplate(addressStr, extraDataHex) {
        let address, extraData;
        try {
            address = Nimiq.Address.fromString(addressStr);
            extraData = Nimiq.BufferUtils.fromHex(extraDataHex);
        } catch (e) {}
        const block = await this._miner.getNextBlock(address, extraData);
        if (!block) {
            const e = new Error('Cannot create work template, check state before requesting work.');
            e.code = 501;
            throw e;
        }
        const shareCompact = this._miner.shareCompact || Nimiq.BlockUtils.targetToCompact(block.target);
        const merklePath = await Nimiq.MerklePath.compute(block.body.getMerkleLeafs(), block.minerAddr);
        const merkleHashes = merklePath.nodes.map(mpn => mpn.hash.toHex()).slice(1);
        return {
            header: {
                version: block.header.version,
                prevHash: block.header.prevHash.toHex(),
                interlinkHash: block.header.interlinkHash.toHex(),
                accountsHash: block.header.accountsHash.toHex(),
                nBits: block.header.nBits,
                height: block.header.height,
            },
            interlink: Nimiq.BufferUtils.toHex(block.interlink.serialize()),
            target: shareCompact,
            body: {
                hash: block.body.hash().toHex(),
                minerAddr: block.body.minerAddr.toHex(),
                extraData: Nimiq.BufferUtils.toHex(block.body.extraData),
                transactions: block.body.transactions.map(tx => Nimiq.BufferUtils.toHex(tx.serialize())),
                merkleHashes: merkleHashes,
                prunedAccounts: block.body.prunedAccounts.map(acc => Nimiq.BufferUtils.toHex(acc.serialize()))
            }
        }
    }

    /**
     * @param {string} blockHex
     * @returns {Promise}
     */
    async submitBlock(blockHex) {
        /** @type {Block} */
        const block = Nimiq.Block.unserialize(Nimiq.BufferUtils.fromHex(blockHex));
        if (!block.header.bodyHash.equals(block.body.hash())) throw new Error('Submitted invalid block: bodyHash and body.hash() mismatch');
        return this._miner.onWorkerShare({hash: await block.header.pow(), nonce: block.header.nonce, block});
    }

    /*
     * Accounts
     */

    async accounts() {
        const addresses = await this._walletStore.list();
        const accounts = await this._client.getAccounts(addresses);
        return addresses.map((address, i) => this._accountToObj(accounts[i], address));
    }

    async createAccount() {
        const wallet = Nimiq.Wallet.generate();
        await this._walletStore.put(wallet);
        return this._walletToObj(wallet);
    }

    async getBalance(addrString, atBlock) {
        if (atBlock && atBlock !== 'latest') throw new Error(`Cannot calculate balance at block ${atBlock}`);
        return (await this._client.getAccount(Nimiq.Address.fromString(addrString))).balance;
    }

    async getAccount(addr) {
        const address = Nimiq.Address.fromString(addr);
        const account = await this._client.getAccount(address);
        return this._accountToObj(account, address);
    }

    /*
     * Blockchain
     */

    async blockNumber() {
        return this._client.getHeadHeight();
    }

    async getBlockTransactionCountByHash(blockHash) {
        const block = await this._client.getBlock(Nimiq.Hash.fromString(blockHash), true);
        return block ? block.transactionCount : null;
    }

    async getBlockTransactionCountByNumber(number) {
        const block = await this._getBlockByNumber(number);
        return block ? block.transactionCount : null;
    }

    async getBlockByHash(blockHash, includeTransactions) {
        const block = await this._client.getBlock(Nimiq.Hash.fromString(blockHash), true);
        return block ? this._blockToObj(block, includeTransactions) : null;
    }

    async getBlockByNumber(number, includeTransactions) {
        const block = await this._getBlockByNumber(number);
        return block ? this._blockToObj(block, includeTransactions) : null;
    }


    /*
     * Utils
     */

    constant(constant, value) {
        if (typeof value !== 'undefined') {
            if (value === 'reset') {
                Nimiq.ConstantHelper.instance.reset(constant);
            } else {
                value = parseInt(value);
                Nimiq.ConstantHelper.instance.set(constant, value);
            }
        }
        return Nimiq.ConstantHelper.instance.get(constant);
    }

    log(tag, level) {
        if (tag && level) {
            if (tag === '*') {
                Nimiq.Log.instance.level = level;
            } else {
                Nimiq.Log.instance.setLoggable(tag, level);
            }
            return true;
        } else {
            throw new Error('Missing argument');
        }
    }

    /**
     * @param {number|string} number
     * @returns {Promise.<?Block>}
     * @private
     */
    async _getBlockByNumber(number) {
        if (typeof number === 'string') {
            if (number.startsWith('latest-')) {
                number = (await this._client.getHeadHeight()) - parseInt(number.substring(7));
            } else if (number === 'latest') {
                number = await this._client.getHeadHeight();
            } else {
                number = parseInt(number);
            }
        }
        if (number === 0) number = 1;
        if (number === 1) return Promise.resolve(Nimiq.GenesisConfig.GENESIS_BLOCK);
        return this._client.getBlockAt(number, true);
    }

    /**
     * @param {string} [host]
     * @param {number} [port]
     * @returns {boolean}
     * @private
     */
    _isPoolValid(host, port) {
        host = typeof host !== 'undefined' ? host : this._poolConfig.host;
        port = typeof port !== 'undefined' ? port : this._poolConfig.port;
        return typeof host === 'string' && host && typeof port === 'number' && !Number.isNaN(port) && port >= 0;
    }

    /**
     * @param {Account} account
     * @param {Address} address
     * @returns {object}
     * @private
     */
    _accountToObj(account, address) {
        if (!account) return null;
        const obj = {
            id: address.toHex(),
            address: address.toUserFriendlyAddress(),
            balance: account.balance,
            type: account.type
        };
        if (account instanceof Nimiq.VestingContract) {
            obj.owner = account.owner.toHex();
            obj.ownerAddress = account.owner.toUserFriendlyAddress();
            obj.vestingStart = account.vestingStart;
            obj.vestingStepBlocks = account.vestingStepBlocks;
            obj.vestingStepAmount = account.vestingStepAmount;
            obj.vestingTotalAmount = account.vestingTotalAmount;
        } else if (account instanceof Nimiq.HashedTimeLockedContract) {
            obj.sender = account.sender.toHex();
            obj.senderAddress = account.sender.toUserFriendlyAddress();
            obj.recipient = account.recipient.toHex();
            obj.recipientAddress = account.recipient.toUserFriendlyAddress();
            obj.hashRoot = account.hashRoot.toHex();
            obj.hashAlgorithm = account.hashRoot.algorithm;
            obj.hashCount = account.hashCount;
            obj.timeout = account.timeout;
            obj.totalAmount = account.totalAmount;
        }
        return obj;
    }

    /**
     * @param {Client.PeerInfo} peerInfo
     * @param {Client.AddressInfo} addressInfo
     * @private
     */
    _infoToPeerObj(peerInfo, addressInfo) {
        const basicAddress = peerInfo || addressInfo;
        if (!basicAddress) return null;
        return {
            id: basicAddress.peerId ? basicAddress.peerId.toHex() : null,
            address: basicAddress.peerAddress.toString(),
            addressState: addressInfo ? addressInfo.state : undefined,
            connectionState: peerInfo ? peerInfo.state : undefined,
            version: peerInfo ? peerInfo.version : undefined,
            timeOffset: peerInfo ? peerInfo.timeOffset : undefined,
            headHash: peerInfo && peerInfo.headHash ? peerInfo.headHash.toHex() : undefined,
            latency: peerInfo ? peerInfo.latency : undefined,
            rx: peerInfo ? peerInfo.bytesReceived : undefined,
            tx: peerInfo ? peerInfo.bytesSent : undefined
        };
    }

    /**
     * @param {Block} block
     * @param {boolean} [includeTransactions]
     * @private
     */
    async _blockToObj(block, includeTransactions = false) {
        const obj = {
            number: block.height,
            hash: block.hash().toHex(),
            pow: (await block.pow()).toHex(),
            parentHash: block.prevHash.toHex(),
            nonce: block.nonce,
            bodyHash: block.bodyHash.toHex(),
            accountsHash: block.accountsHash.toHex(),
            difficulty: block.difficulty,
            timestamp: block.timestamp,
            confirmations: (await this._client.getHeadHeight()) - block.height
        };
        if (block.isFull()) {
            obj.miner = block.minerAddr.toHex();
            obj.minerAddress = block.minerAddr.toUserFriendlyAddress();
            obj.extraData = Nimiq.BufferUtils.toHex(block.body.extraData);
            obj.size = block.serializedSize;
            obj.transactions = includeTransactions
                ? await Promise.all(block.transactions.map((tx, i) => this._transactionToObj(tx, block, i)))
                : block.transactions.map((tx) => tx.hash().toHex());
        }
        return obj;
    }

    /**
     * @param {Transaction} tx
     * @param {Block} [block]
     * @param {number} [i]
     * @private
     */
    async _transactionToObj(tx, block, i) {
        return {
            hash: tx.hash().toHex(),
            blockHash: block ? block.hash().toHex() : undefined,
            blockNumber: block ? block.height : undefined,
            timestamp: block ? block.timestamp : undefined,
            confirmations: block ? (await this._client.getHeadHeight()) - block.height + 1 : 0,
            transactionIndex: i,
            from: tx.sender ? tx.sender.toHex() : undefined,
            fromAddress: tx.sender ? tx.sender.toUserFriendlyAddress() : undefined,
            to: tx.recipient ? tx.recipient.toHex() : undefined,
            toAddress: tx.recipient ? tx.recipient.toUserFriendlyAddress() : undefined,
            value: tx.value,
            fee: tx.fee,
            data: Nimiq.BufferUtils.toHex(tx.data) || null,
            flags: tx.flags
        };
    }

    /**
     * @param {Client.TransactionDetails} tx
     * @private
     */
    _transactionDetailsToObj(tx) {
        return {
            hash: tx.transactionHash.toHex(),
            blockHash: tx.blockHash ? tx.blockHash.toHex() : undefined,
            blockNumber: tx.blockHeight,
            timestamp: tx.timestamp,
            confirmations: tx.confirmations,
            from: tx.sender.toHex(),
            fromAddress: tx.sender.toUserFriendlyAddress(),
            to: tx.recipient.toHex(),
            toAddress: tx.recipient.toUserFriendlyAddress(),
            value: tx.value,
            fee: tx.fee,
            data: Nimiq.BufferUtils.toHex(tx.data.raw) || null,
            flags: tx.flags
        };
    }

    /**
     * @param {Wallet} wallet
     * @param {boolean} [withPrivateKey]
     * @private
     */
    _walletToObj(wallet, withPrivateKey) {
        const a = {
            id: wallet.address.toHex(),
            address: wallet.address.toUserFriendlyAddress(),
            publicKey: wallet.publicKey.toHex()
        };
        if (withPrivateKey) a.privateKey = wallet.keyPair.privateKey.toHex();
        return a;
    }

    /**
     * @param {Address} address
     * @private
     */
    _addressToObj(address) {
        return {
            id: address.toHex(),
            address: address.toUserFriendlyAddress()
        };
    }


    _onWebsocketConnection(ws) {
        Nimiq.Log.i(JsonRpcServer, 'A websocket client has connected');
        const that = this;
        ws.on('message', async (data) => {
            let single = false;
            let body = [];
            try {
                body = JSON.parse(data);
                single = !(body instanceof Array);
            } catch (e) {
                body = null;
            }
            if (!body || body.length > 100) {
                ws.send(JSON.stringify({
                    'jsonrpc': '2.0',
                    'error': {'code': -32600, 'message': 'Invalid Request'},
                    'id': null
                }));
            }
            if (single) {
                body = [body];
            }
            const result = await that.handleJson(body);
            if (single && result.length === 1) {
                ws.send(JSON.stringify(result[0]));
            } else if (!single) {
                ws.send(JSON.stringify(result));
            }
        });
    }

    _onRequest(req, res) {
        let body = [];
        req.on('data', (chunk) => {
            body.push(chunk);
        }).on('end', async () => {
            let single = false;
            try {
                body = JSON.parse(Buffer.concat(body).toString());
                single = !(body instanceof Array);
            } catch (e) {
                body = null;
            }
            if (!body || body.length > 100) {
                res.writeHead(400);
                res.end(JSON.stringify({
                    'jsonrpc': '2.0',
                    'error': {'code': -32600, 'message': 'Invalid Request'},
                    'id': null
                }));
                return;
            }
            if (single) {
                body = [body];
            }

            res.writeHead(200);
            const result = await this.handleJson(body);
            
            if (single && result.length === 1) {
                res.write(JSON.stringify(result[0]));
            } else if (!single) {
                res.write(JSON.stringify(result));
            }
            res.end("\r\n");
        });


    }

    async handleJson(data) {
        const result = [];
        for (const msg of data) {
            if (!msg || msg.jsonrpc !== '2.0' || !msg.method) {
                result.push({
                    'jsonrpc': '2.0',
                    'error': {'code': -32600, 'message': 'Invalid Request'},
                    'id': msg ? msg.id : null
                });
                continue;
            }
            if (!this._methods.has(msg.method)) {
                Nimiq.Log.w(JsonRpcServer, 'Unknown method called', msg.method);
                result.push({
                    'jsonrpc': '2.0',
                    'error': {'code': -32601, 'message': 'Method not found'},
                    'id': msg.id
                });
                continue;
            }
            try {
                const methodRes = await this._methods.get(msg.method).apply(null, msg.params instanceof Array ? msg.params : [msg.params]);
                if (typeof msg.id === 'string' || Number.isInteger(msg.id)) {
                    result.push({'jsonrpc': '2.0', 'result': methodRes, 'id': msg.id});
                }
            } catch (e) {
                Nimiq.Log.d(JsonRpcServer, e.stack);
                result.push({
                    'jsonrpc': '2.0',
                    'error': {'code': e.code || 1, 'message': e.message || e.toString()},
                    'id': msg.id
                });
            }
        }
        return result;
    }
}

module.exports = exports = JsonRpcServer;
