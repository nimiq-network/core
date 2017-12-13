// TODO V2: Store private key encrypted
class Wallet {
    /**
     * Create a Wallet with persistent storage backend.
     * @returns {Promise.<Wallet>} A Wallet object. If the persisted storage already stored a Wallet before, this will be reused.
     */
    static async getPersistent() {
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
     * Create a Wallet that will lose its data after this session.
     * @returns {Promise.<Wallet>} Newly created Wallet.
     */
    static async createVolatile() {
        return new Wallet(await KeyPair.generate());
    }

    static load(hexBuf) {
        if (!StringUtils.isHexBytes(hexBuf, KeyPair.SERIALIZED_SIZE)) {
            throw 'Invalid wallet seed';
        }

        return new Wallet(KeyPair.fromHex(hexBuf));
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
     * @param {number} nonce The nonce representing the current balance of the sender.
     * @returns {Promise.<Transaction>} A prepared and signed Transaction object. This still has to be sent to the network.
     */
    createTransaction(recipient, value, fee, nonce) {
        const transaction = new BasicTransaction(this._keyPair.publicKey, recipient, value, fee, nonce);
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

    /** 
     * @returns {string}
     */
    dump() {
        return this._keyPair.toHex();
    }

    /**
     * @returns {Promise}
     */
    async persist() {
        const db = await new WalletStore();
        await db.put('keys', this._keyPair);
        await db.close();
    }
}
Class.register(Wallet);
