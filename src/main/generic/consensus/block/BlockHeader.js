class BlockHeader {
    /**
     * @param {Hash} prevHash
     * @param {Hash} bodyHash
     * @param {Hash} accountsHash
     * @param {number} nBits
     * @param {number} height
     * @param {number} timestamp
     * @param {number} nonce
     * @param {number} version
     */
    constructor(prevHash, bodyHash, accountsHash, nBits, height, timestamp, nonce, version = BlockHeader.CURRENT_VERSION) {
        if (!NumberUtils.isUint16(version)) throw 'Malformed version';
        if (!Hash.isHash(prevHash)) throw 'Malformed prevHash';
        if (!Hash.isHash(bodyHash)) throw 'Malformed bodyHash';
        if (!Hash.isHash(accountsHash)) throw 'Malformed accountsHash';
        if (!NumberUtils.isUint32(nBits) || !BlockUtils.isValidCompact(nBits)) throw 'Malformed nBits';
        if (!NumberUtils.isUint32(height)) throw 'Invalid height';
        if (!NumberUtils.isUint32(timestamp)) throw 'Malformed timestamp';
        if (!NumberUtils.isUint64(nonce)) throw 'Malformed nonce';

        /** @type {number} */
        this._version = version;
        /** @type {Hash} */
        this._prevHash = prevHash;
        /** @type {Hash} */
        this._bodyHash = bodyHash;
        /** @type {Hash} */
        this._accountsHash = accountsHash;
        /** @type {number} */
        this._nBits = nBits;
        /** @type {number} */
        this._height = height;
        /** @type {number} */
        this._timestamp = timestamp;
        /** @type {number} */
        this._nonce = nonce;
    }

    static unserialize(buf) {
        const version = buf.readUint16();
        if (!BlockHeader.SUPPORTED_VERSIONS.includes(version)) throw 'Block version unsupported';
        const prevHash = Hash.unserialize(buf);
        const bodyHash = Hash.unserialize(buf);
        const accountsHash = Hash.unserialize(buf);
        const nBits = buf.readUint32();
        const height = buf.readUint32();
        const timestamp = buf.readUint32();
        const nonce = buf.readUint64();
        return new BlockHeader(prevHash, bodyHash, accountsHash, nBits, height, timestamp, nonce, version);
    }

    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.writeUint16(this._version);
        this._prevHash.serialize(buf);
        this._bodyHash.serialize(buf);
        this._accountsHash.serialize(buf);
        buf.writeUint32(this._nBits);
        buf.writeUint32(this._height);
        buf.writeUint32(this._timestamp);
        buf.writeUint64(this._nonce);
        return buf;
    }

    /** @type {number} */
    get serializedSize() {
        return /*version*/ 2
            + this._prevHash.serializedSize
            + this._bodyHash.serializedSize
            + this._accountsHash.serializedSize
            + /*nBits*/ 4
            + /*height*/ 4
            + /*timestamp*/ 4
            + /*nonce*/ 8;
    }

    /**
     * @param {?SerialBuffer} [buf]
     * @return {Promise.<boolean>}
     */
    async verifyProofOfWork(buf) {
        const pow = await this.pow(buf);
        return BlockUtils.isProofOfWork(pow, this.target);
    }

    /**
     * @param {?SerialBuffer} [buf]
     * @return {Promise.<Hash>}
     */
    async hash(buf) {
        this._hash = this._hash || await Hash.light(this.serialize(buf));
        return this._hash;
    }
    
    /**
     * @param {?SerialBuffer} [buf]
     * @return {Promise.<Hash>}
     */
    async pow(buf) {
        this._pow = this._pow || await Hash.hard(this.serialize(buf));
        return this._pow;
    }

    equals(o) {
        return o instanceof BlockHeader
            && this._prevHash.equals(o.prevHash)
            && this._bodyHash.equals(o.bodyHash)
            && this._accountsHash.equals(o.accountsHash)
            && this._nBits === o.nBits
            && this._height === o.height
            && this._timestamp === o.timestamp
            && this._nonce === o.nonce;
    }

    toString() {
        return `BlockHeader{`
            + `prevHash=${this._prevHash}, `
            + `bodyHash=${this._bodyHash}, `
            + `accountsHash=${this._accountsHash}, `
            + `nBits=${this._nBits.toString(16)}, `
            + `height=${this._height}, `
            + `timestamp=${this._timestamp}, `
            + `nonce=${this._nonce}`
            + `}`;
    }

    /** @type {Hash} */
    get prevHash() {
        return this._prevHash;
    }

    /** @type {Hash} */
    get bodyHash() {
        return this._bodyHash;
    }

    /** @type {Hash} */
    get accountsHash() {
        return this._accountsHash;
    }

    /** @type {number} */
    get nBits() {
        return this._nBits;
    }

    /** @type {number} */
    get target() {
        return BlockUtils.compactToTarget(this._nBits);
    }

    /** @type {number} */
    get difficulty() {
        return BlockUtils.compactToDifficulty(this._nBits);
    }

    /** @type {number} */
    get height() {
        return this._height;
    }

    /** @type {number} */
    get timestamp() {
        return this._timestamp;
    }

    /** @type {number} */
    get nonce() {
        return this._nonce;
    }

    // XXX The miner changes the nonce of an existing BlockHeader during the
    // mining process.
    /** @type {number} */
    set nonce(n) {
        this._nonce = n;
        this._hash = null;
        this._pow = null;
    }
}
BlockHeader.CURRENT_VERSION = 1;
BlockHeader.SUPPORTED_VERSIONS = [1];
Class.register(BlockHeader);
