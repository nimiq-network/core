class AccountsTreeStore {
    /**
     * @param {JungleDB} jdb
     */
    static initPersistent(jdb) {
        jdb.createObjectStore('Accounts', new AccountsTreeStoreCodec());
    }

    /**
     * @param {JungleDB} jdb
     * @returns {AccountsTreeStore}
     */
    static getPersistent(jdb) {
        return new AccountsTreeStore(jdb.getObjectStore('Accounts'));
    }

    /**
     * @returns {AccountsTreeStore}
     */
    static createVolatile() {
        const store = JDB.JungleDB.createVolatileObjectStore();
        return new AccountsTreeStore(store);
    }

    /**
     * @param {IObjectStore} store
     */
    constructor(store) {
        this._store = store;
    }

    /**
     * @override
     * @param {string} key
     * @returns {Promise.<AccountsTreeNode>}
     */
    get(key) {
        return this._store.get(key);
    }

    /**
     * @override
     * @param {AccountsTreeNode} node
     * @returns {Promise.<string>}
     */
    async put(node) {
        const key = node.prefix;
        await this._store.put(key, node);
        return key;
    }

    /**
     * @override
     * @param {AccountsTreeNode} node
     * @returns {Promise.<string>}
     */
    async remove(node) {
        const key = node.prefix;
        await this._store.remove(key);
        return key;
    }

    /**
     * @returns {Promise.<AccountsTreeNode>}
     */
    getRootNode() {
        return this.get('');
    }

    /**
     * @param startPrefix This prefix will *not* be included.
     * @param size
     * @returns {Promise.<Array.<AccountsTreeNode>>}
     */
    async getTerminalNodes(startPrefix, size) {
        const relevantKeys = [];
        await this._store.keyStream(key => {
            if (key.length === Address.HEX_SIZE) {
                relevantKeys.push(key);
                if (relevantKeys.length === size) {
                    return false;
                }
            }
            return true;
        }, true, JDB.KeyRange.lowerBound(startPrefix, true));
        const nodes = [];
        for (const key of relevantKeys) {
            nodes.push(this._store.get(key));
        }
        return Promise.all(nodes);
    }

    snapshot() {
        const snapshot = this._store.snapshot();
        return new AccountsTreeStore(snapshot);
    }

    /**
     * @param {boolean} [enableWatchdog}
     * @returns {AccountsTreeStore}
     */
    transaction(enableWatchdog = true) {
        const tx = this._store.transaction(enableWatchdog);
        return new AccountsTreeStore(tx);
    }

    truncate() {
        return this._store.truncate();
    }

    /**
     * @returns {Promise}
     */
    commit() {
        return this._store.commit();
    }

    /**
     * @returns {Promise}
     */
    abort() {
        return this._store.abort();
    }
}
Class.register(AccountsTreeStore);

/**
 * @implements {ICodec}
 */
class AccountsTreeStoreCodec {
    /**
     * @param {*} obj The object to encode before storing it.
     * @returns {*} Encoded object.
     */
    encode(obj) {
        return obj.stripDown();
    }

    /**
     * @param {*} obj The object to decode.
     * @param {string} key The object's primary key.
     * @returns {*} Decoded object.
     */
    decode(obj, key) {
        obj._prefix = key; // Restore prefix.
        return AccountsTreeNode.copy(obj);
    }

    /**
     * @type {{encode: function(val:*):*, decode: function(val:*):*, buffer: boolean, type: string}|void}
     */
    get valueEncoding() {
        return JDB.JungleDB.JSON_ENCODING;
    }
}
