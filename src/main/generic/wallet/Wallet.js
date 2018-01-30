class Wallet {
    /**
     * Tests if a persisted wallet exists in the store.
     * @returns {boolean}
     */
    static async hasPersistent() {
        await Crypto.prepareSyncCryptoWorker();
        const db = await new WalletStore();
        const keys = await db.get('keys');
        await db.close();
        return !!keys;
    }

    /**
     * Create a Wallet with persistent storage backend.
     * @returns {Promise.<Wallet>} A Wallet object. If the persisted storage already stored a Wallet before, this will be reused.
     */
    static async getPersistent() {
        await Crypto.prepareSyncCryptoWorker();
        const db = await new WalletStore();
        let keys = await db.get('keys');
        if (!keys) {
            keys = await KeyPair.generate();
            await db.put('keys', keys);
        }
        await db.close();
        return new Wallet(keys);
    }

    /**
     * Clears a wallet from persistent storage backend.
     * @returns {Promise}
     */
    async clearPersistent() {
        await Crypto.prepareSyncCryptoWorker();
        const db = await new WalletStore();
        await db.remove('keys');
        await db.close();
    }

    /**
     * Create a Wallet that will lose its data after this session.
     * @returns {Promise.<Wallet>} Newly created Wallet.
     */
    static async createVolatile() {
        await Crypto.prepareSyncCryptoWorker();
        return new Wallet(await KeyPair.generate());
    }

    /**
     * @param {Uint8Array|string} buf
     * @return {Wallet}
     */
    static load(buf) {
        if (typeof buf === 'string') buf = BufferUtils.fromHex(buf);
        if (!buf || buf.byteLength === 0) {
            throw new Error('Invalid wallet seed');
        }
        return new Wallet(KeyPair.unserialize(new SerialBuffer(buf)));
    }

    /**
     * @param {Uint8Array|string} buf
     * @param {Uint8Array|string} key
     * @return {Promise.<Wallet>}
     */
    static async loadEncrypted(buf, key) {
        if (typeof buf === 'string') buf = BufferUtils.fromHex(buf);
        if (typeof key === 'string') key = BufferUtils.fromAscii(key);
        return new Wallet(await KeyPair.fromEncrypted(new SerialBuffer(buf), key));
    }

    /**
     * Create a new Wallet object.
     * @param {KeyPair} keyPair KeyPair owning this Wallet.
     * @returns {Wallet} A newly generated Wallet.
     */
    constructor(keyPair) {
        /** @type {KeyPair} */
        this._keyPair = keyPair;
        /** @type {Address} */
        this._address = undefined;
        this._address = this._keyPair.publicKey.toAddressSync();
    }

    /**
     * Create a Transaction that is signed by the owner of this Wallet.
     * @param {Address} recipient Address of the transaction receiver
     * @param {number} value Number of Satoshis to send.
     * @param {number} fee Number of Satoshis to donate to the Miner.
     * @param {number} validityStartHeight The validityStartHeight for the transaction.
     * @returns {Promise.<Transaction>} A prepared and signed Transaction object. This still has to be sent to the network.
     */
    createTransaction(recipient, value, fee, validityStartHeight) {
        const transaction = new BasicTransaction(this._keyPair.publicKey, recipient, value, fee, validityStartHeight);
        return this._signTransaction(transaction);
    }

    /**
     * @param {BasicTransaction} transaction
     * @returns {Promise.<Transaction>}
     * @private
     */
    async _signTransaction(transaction) {
        transaction.signature = await Signature.create(this._keyPair.privateKey, this._keyPair.publicKey, transaction.serializeContent());
        return transaction;
    }


    /**
     * @deprecated
     * @returns {string}
     */
    dump() {
        return this._keyPair.toHex();
    }

    /**
     * @returns {Uint8Array}
     */
    exportPlain() {
        return this._keyPair.serialize();
    }

    /**
     * @param {Uint8Array|string} key
     * @param {Uint8Array|string} [unlockKey]
     * @return {Promise.<Uint8Array>}
     */
    exportEncrypted(key, unlockKey) {
        if (typeof key === 'string') key = BufferUtils.fromAscii(key);
        if (typeof unlockKey === 'string') unlockKey = BufferUtils.fromAscii(unlockKey);
        return this._keyPair.exportEncrypted(key, unlockKey);
    }

    /**
     * @returns {Promise}
     */
    async persist() {
        const db = await new WalletStore();
        await db.put('keys', this._keyPair);
        await db.close();
    }

    /** @type {boolean} */
    get isLocked() {
        return this.keyPair.isLocked;
    }

    /**
     * @param {Uint8Array|string} key
     * @returns {Promise.<void>}
     */
    async lock(key) {
        if (typeof key === 'string') key = BufferUtils.fromAscii(key);
        return this.keyPair.lock(key);
    }

    relock() {
        this.keyPair.relock();
    }

    /**
     * @param {Uint8Array|string} key
     * @returns {Promise.<void>}
     */
    unlock(key) {
        if (typeof key === 'string') key = BufferUtils.fromAscii(key);
        return this.keyPair.unlock(key);
    }

    /**
     * The address of the Wallet owner.
     * @type {Address}
     */
    get address() {
        return this._address;
    }

    /**
     * The public key of the Wallet owner
     * @type {PublicKey}
     */
    get publicKey() {
        return this._keyPair.publicKey;
    }

    /** @type {KeyPair} */
    get keyPair() {
        return this._keyPair;
    }
}

Class.register(Wallet);
