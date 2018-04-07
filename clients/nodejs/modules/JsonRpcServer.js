const http = require('http');
const btoa = require('btoa');
const Nimiq = require('../../../dist/node.js');

class JsonRpcServer {
    /**
     * @param {{port: number, corsdomain: string|Array.<string>, username: ?string, password: ?string}} config
     */
    constructor(config) {
        if (typeof config.corsdomain === 'string') config.corsdomain = [config.corsdomain];
        if (!config.corsdomain) config.corsdomain = [];
        http.createServer((req, res) => {
            if (config.corsdomain.includes(req.headers.origin)) {
                res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
                res.setHeader('Access-Control-Allow-Methods', 'POST');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
        }).listen(config.port, '127.0.0.1');


        /** @type {Map.<string, function(*)>} */
        this._methods = new Map();

        this._consensus_state = 'syncing';
    }

    /**
     * @param {FullConsensus} consensus
     * @param {FullChain} blockchain
     * @param {Accounts} accounts
     * @param {Mempool} mempool
     * @param {Network} network
     * @param {Miner} miner
     * @param {WalletStore} walletStore
     */
    init(consensus, blockchain, accounts, mempool, network, miner, walletStore) {
        this._consensus = consensus;
        this._blockchain = blockchain;
        this._accounts = accounts;
        this._mempool = mempool;
        this._network = network;
        this._miner = miner;
        this._walletStore = walletStore;

        this._startingBlock = blockchain.height;
        this._consensus.on('established', () => this._consensus_state = 'established');
        this._consensus.on('syncing', () => this._consensus_state = 'syncing');
        this._consensus.on('lost', () => this._consensus_state = 'lost');

        // Network
        this._methods.set('peerCount', this.peerCount.bind(this));
        this._methods.set('syncing', this.syncing.bind(this));
        this._methods.set('consensus', this.consensus.bind(this));
        this._methods.set('peerList', this.peerList.bind(this));
        this._methods.set('peerState', this.peerState.bind(this));

        // Transactions
        this._methods.set('sendRawTransaction', this.sendRawTransaction.bind(this));
        this._methods.set('sendTransaction', this.sendTransaction.bind(this));
        this._methods.set('getTransactionByBlockHashAndIndex', this.getTransactionByBlockHashAndIndex.bind(this));
        this._methods.set('getTransactionByBlockNumberAndIndex', this.getTransactionByBlockNumberAndIndex.bind(this));
        this._methods.set('getTransactionByHash', this.getTransactionByHash.bind(this));
        this._methods.set('getTransactionReceipt', this.getTransactionReceipt.bind(this));
        this._methods.set('getTransactionsByAddress', this.getTransactionsByAddress.bind(this));
        this._methods.set('mempool', this.mempool.bind(this));
        this._methods.set('minFeePerByte', this.minFeePerByte.bind(this));

        // Miner
        this._methods.set('mining', this.mining.bind(this));
        this._methods.set('hashrate', this.hashrate.bind(this));
        this._methods.set('minerThreads', this.minerThreads.bind(this));

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
    }

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

    peerCount() {
        return this._network.peerCount;
    }

    consensus() {
        return this._consensus_state;
    }

    syncing() {
        if (this._consensus_state === 'established') return false;
        const currentBlock = this._blockchain.height;
        const highestBlock = this._blockchain.height; // TODO
        return {
            startingBlock: this._startingBlock,
            currentBlock: currentBlock,
            highestBlock: highestBlock
        };
    }

    peerList() {
        return this._network.addresses.values().map((a) => this._peerAddressStateToPeerObj(a));
    }

    /**
     * @param {string} peer
     */
    peerState(peer, set) {
        const split = peer.split('/');
        let peerAddress;
        if (split.length === 1 || (split.length === 4 && split[3].length > 0)) {
            const peerId = Nimiq.PeerId.fromHex(split[split.length - 1]);
            peerAddress = this._network.addresses.getByPeerId(peerId);
        } else if (split[0] === 'wss:' && split.length >= 3) {
            const colons = split[2].split(':', 2);
            if (colons.length === 2) {
                peerAddress = this._network.addresses.get(Nimiq.WsPeerAddress.seed(colons[0], parseInt(colons[1])));
            }
        }
        const addressState = peerAddress ? this._network.addresses.getState(peerAddress) : null;
        const connection = peerAddress ? this._network.connections.getConnectionByPeerAddress(peerAddress) : null;
        if (typeof set === 'string') {
            set = set.toLowerCase();
            switch (set) {
                case 'disconnect':
                    if (connection) {
                        connection.peerChannel.close(Nimiq.CloseType.MANUAL_PEER_DISCONNECT);
                    }
                    break;
                case 'fail':
                    if (connection) {
                        connection.peerChannel.close(Nimiq.CloseType.MANUAL_PEER_FAIL);
                    }
                    break;
                case 'ban':
                    if (connection) {
                        connection.peerChannel.close(Nimiq.CloseType.MANUAL_PEER_BAN);
                    }
                    break;
                case 'unban':
                    if (addressState.state === Nimiq.PeerAddressState.BANNED) {
                        addressState.state = Nimiq.PeerAddressState.TRIED;
                    }
                    break;
                case 'connect':
                    if (!connection) {
                        this._network.connections.connectOutbound(peerAddress);
                    }
                    break;
            }
        }
        return this._peerAddressStateToPeerObj(addressState);
    }

    /*
     * Transactions
     */

    async sendRawTransaction(txhex) {
        const tx = Nimiq.Transaction.unserialize(Nimiq.BufferUtils.fromHex(txhex));
        const ret = await this._mempool.pushTransaction(tx);
        if (ret < 0) {
            const e = new Error(`Transaction not accepted: ${ret}`);
            e.code = ret;
            throw e;
        }
        return tx.hash().toHex();
    }

    async sendTransaction(tx) {
        const from = Nimiq.Address.fromString(tx.from);
        const fromType = tx.fromType ? Number.parseInt(tx.fromType) : Nimiq.Account.Type.BASIC;
        const to = Nimiq.Address.fromString(tx.to);
        const toType = tx.toType ? Number.parseInt(tx.toType) : Nimiq.Account.Type.BASIC;
        const value = parseInt(tx.value);
        const fee = parseInt(tx.fee);
        const data = tx.data ? Nimiq.BufferUtils.fromHex(tx.data) : null;
        /** @type {Wallet} */
        const wallet = await this._walletStore.get(from);
        if (!wallet || !(wallet instanceof Nimiq.Wallet)) {
            throw new Error(`"${tx.from}" can not sign transactions using this node.`);
        }
        let transaction;
        if (fromType !== Nimiq.Account.Type.BASIC) {
            throw new Error('Only basic transactions may be sent using "sendTransaction".');
        } else if (toType !== Nimiq.Account.Type.BASIC || data !== null) {
            transaction = new Nimiq.ExtendedTransaction(from, fromType, to, toType, value, fee, blockchain.height, Nimiq.Transaction.Flag.NONE, data);
            transaction.proof = Nimiq.SignatureProof.singleSig(wallet.publicKey, Nimiq.Signature.create(wallet.keyPair.privateKey, wallet.publicKey, transaction.serializeContent())).serialize();
        } else {
            transaction = wallet.createTransaction(to, value, fee, this._blockchain.height);
        }
        const ret = await this._mempool.pushTransaction(transaction);
        if (ret < 0) {
            const e = new Error(`Transaction not accepted: ${ret}`);
            e.code = ret;
            throw e;
        }
        return transaction.hash().toHex();
    }

    async getTransactionByBlockHashAndIndex(blockHash, txIndex) {
        const block = await this._blockchain.getBlock(Nimiq.Hash.fromString(blockHash), /*includeForks*/ false, /*includeBody*/ true);
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

    async _getTransactionByHash(hash) {
        const entry = await this._blockchain.getTransactionInfoByHash(hash);
        if (entry) {
            const block = await this._blockchain.getBlock(entry.blockHash, /*includeForks*/ false, /*includeBody*/ true);
            return this._transactionToObj(block.transactions[entry.index], block, entry.index);
        }
        const mempoolTx = this._mempool.getTransaction(hash);
        if (mempoolTx) {
            return this._transactionToObj(mempoolTx);
        }
        return null;
    }

    async getTransactionReceipt(hash) {
        const entry = await this._blockchain.getTransactionInfoByHash(Nimiq.Hash.fromString(hash));
        if (!entry) return null;
        const block = await this._blockchain.getBlock(entry.blockHash);
        return {
            transactionHash: entry.transactionHash.toHex(),
            transactionIndex: entry.index,
            blockNumber: entry.blockHeight,
            blockHash: entry.blockHash.toHex(),
            confirmations: this._blockchain.height - entry.blockHeight,
            timestamp: block ? block.timestamp : undefined
        };
    }

    async getTransactionsByAddress(addr) {
        const address = Nimiq.Address.fromString(addr);
        const receipts = await this._blockchain.getTransactionReceiptsByAddress(address);
        const result = [];
        for (const r of receipts) {
            result.push(await this._getTransactionByHash(r.transactionHash));
        }
        // const result = await Promise.all(receipts.map((r) => this._getTransactionByHash(r.transactionHash)));
        return result;
    }

    mempool(includeTransactions) {
        return this._mempool.getTransactions().map((tx) => includeTransactions ? JsonRpcServer._transactionToObj(tx) : tx.hash().toHex());
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
        if (!this._miner) throw new Error('This node does not include a miner');
        if (!this._miner.working && enabled === true) this._miner.startWork();
        if (this._miner.working && enabled === false) this._miner.stopWork();
        return this._miner.working;
    }

    hashrate() {
        if (!this._miner) throw new Error('This node does not include a miner');
        return this._miner.hashrate;
    }

    minerThreads(threads) {
        if (typeof threads === 'number') {
            this._miner.threads = threads;
        }
        return this._miner.threads;
    }

    /*
     * Accounts
     */

    async accounts() {
        return (await this._walletStore.list()).map(JsonRpcServer._addressToObj);
    }

    async createAccount() {
        const wallet = await Nimiq.Wallet.generate();
        await this._walletStore.put(wallet);
        return JsonRpcServer._walletToObj(wallet);
    }

    async getBalance(addrString, atBlock) {
        if (atBlock && atBlock !== 'latest') throw new Error(`Cannot calculate balance at block ${atBlock}`);
        return (await this._accounts.get(Nimiq.Address.fromString(addrString))).balance;
    }

    async getAccount(addr) {
        const address = Nimiq.Address.fromString(addr);
        const account = await this._accounts.get(address);
        return this._accountToObj(account, address);
    }

    /*
     * Blockchain
     */

    blockNumber() {
        return this._blockchain.height;
    }

    async getBlockTransactionCountByHash(blockHash) {
        const block = await this._blockchain.getBlock(Nimiq.Hash.fromString(blockHash), /*includeForks*/ false, /*includeBody*/ true);
        return block ? block.transactionCount : null;
    }

    async getBlockTransactionCountByNumber(number) {
        const block = await this._getBlockByNumber(number);
        return block ? block.transactionCount : null;
    }

    async getBlockByHash(blockHash, includeTransactions) {
        const block = await this._blockchain.getBlock(Nimiq.Hash.fromString(blockHash), /*includeForks*/ false, /*includeBody*/ true);
        return block ? JsonRpcServer._blockToObj(block, includeTransactions) : null;
    }

    async getBlockByNumber(number, includeTransactions) {
        const block = await this._getBlockByNumber(number);
        return block ? JsonRpcServer._blockToObj(block, includeTransactions) : null;
    }

    _getBlockByNumber(number) {
        if (typeof number === 'string') {
            if (number.startsWith('latest-')) {
                number = this._blockchain.height - parseInt(number.substring(7));
            } else if (number === 'latest') {
                number = this._blockchain.height;
            } else {
                number = parseInt(number);
            }
        }
        if (number === 0) number = 1;
        return this._blockchain.getBlockAt(number, /*includeBody*/ true);
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
            obj.hashCount = account.hashCount;
            obj.timeout = account.timeout;
            obj.totalAmount = account.totalAmount;
        }
        return obj;
    }

    /**
     * @param {PeerAddressState} peerAddressState
     * @param {PeerConnection} [connection]
     * @private
     */
    _peerAddressStateToPeerObj(peerAddressState, connection) {
        if (!peerAddressState) return null;
        if (!connection) connection = this._network.connections.getConnectionByPeerAddress(peerAddressState.peerAddress);
        const peerAddress = connection && connection.peer && connection.peer.peerAddress ? connection.peer.peerAddress : peerAddressState.peerAddress;
        return {
            id: peerAddress.peerId ? peerAddress.peerId.toHex() : null,
            address: peerAddress.toString(),
            failedAttempts: peerAddressState.failedAttempts,
            addressState: peerAddressState.state,
            connectionState: connection ? connection.state : undefined,
            version: connection && connection.peer ? connection.peer.version : undefined,
            timeOffset: connection && connection.peer ? connection.peer.timeOffset : undefined,
            headHash: connection && connection.peer ? connection.peer.headHash.toHex() : undefined,
            score: connection ? connection.score : undefined,
            latency: connection ? connection.statistics.latencyMedian : undefined,
            rx: connection && connection.networkConnection ? connection.networkConnection.bytesReceived : undefined,
            tx: connection && connection.networkConnection ? connection.networkConnection.bytesSent : undefined
        };
    }

    /**
     * @param {Block} block
     * @param {boolean} [includeTransactions]
     * @private
     */
    static async _blockToObj(block, includeTransactions = false) {
        return {
            number: block.height,
            hash: block.hash().toHex(),
            pow: (await block.pow()).toHex(),
            parentHash: block.prevHash.toHex(),
            nonce: block.nonce,
            bodyHash: block.bodyHash.toHex(),
            accountsHash: block.accountsHash.toHex(),
            miner: block.minerAddr.toHex(),
            minerAddress: block.minerAddr.toUserFriendlyAddress(),
            difficulty: block.difficulty,
            extraData: Nimiq.BufferUtils.toHex(block.body.extraData),
            size: block.serializedSize,
            timestamp: block.timestamp,
            transactions: includeTransactions
                ? block.transactions.map((tx, i) => JsonRpcServer._transactionToObj(tx, block, i))
                : block.transactions.map((tx) => tx.hash().toHex())
        };
    }

    /**
     * @param {Transaction} tx
     * @param {Block} [block]
     * @param {number} [i]
     * @private
     */
    _transactionToObj(tx, block, i) {
        return {
            hash: tx.hash().toHex(),
            blockHash: block ? block.hash().toHex() : undefined,
            blockNumber: block ? block.height : undefined,
            timestamp: block ? block.timestamp : undefined,
            confirmations: block ? this._blockchain.height - block.height + 1 : undefined,
            transactionIndex: i,
            from: tx.sender.toHex(),
            fromAddress: tx.sender.toUserFriendlyAddress(),
            to: tx.recipient.toHex(),
            toAddress: tx.recipient.toUserFriendlyAddress(),
            value: tx.value,
            fee: tx.fee,
            data: Nimiq.BufferUtils.toHex(tx.data) || null
        };
    }

    /**
     * @param {Wallet} wallet
     * @param {boolean} [withPrivateKey]
     * @private
     */
    static _walletToObj(wallet, withPrivateKey) {
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
    static _addressToObj(address) {
        return {
            id: address.toHex(),
            address: address.toUserFriendlyAddress()
        };
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
            if (!body) {
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
            const result = [];
            for (const msg of body) {
                if (msg.jsonrpc !== '2.0' || !msg.method) {
                    result.push({
                        'jsonrpc': '2.0',
                        'error': {'code': -32600, 'message': 'Invalid Request'},
                        'id': msg.id
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
                    if (msg.id) {
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
            if (single && result.length === 1) {
                res.end(JSON.stringify(result[0]));
            } else if (!single) {
                res.end(JSON.stringify(result));
            }
        });
    }
}

module.exports = exports = JsonRpcServer;
