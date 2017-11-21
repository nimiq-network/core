class HeaderChain {
    /**
     * @param {Array.<BlockHeader>} headers
     */
    constructor(headers) {
        if (!headers || !NumberUtils.isUint16(headers.length)
            || headers.some(it => !(it instanceof BlockHeader))) throw new Error('Malformed headers');

        /** @type {Array.<BlockHeader>} */
        this._headers = headers;
    }

    /**
     * @param {SerialBuffer} buf
     * @returns {HeaderChain}
     */
    static unserialize(buf) {
        const count = buf.readUint16();
        const headers = [];
        for (let i = 0; i < count; i++) {
            headers.push(BlockHeader.unserialize(buf));
        }
        return new HeaderChain(headers);
    }

    /**
     * @param {SerialBuffer} [buf]
     * @returns {SerialBuffer}
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.writeUint16(this._headers.length);
        for (const header of this._headers) {
            header.serialize(buf);
        }
        return buf;
    }

    /** @type {number} */
    get serializedSize() {
        return /*count*/ 2
            + this._headers.reduce((sum, header) => sum + header.serializedSize, 0);
    }

    /**
     * @returns {Promise.<boolean>}
     */
    async verify() {
        // For performance reasons, we DO NOT VERIFY the validity of the blocks in the chain here.
        // Block validity is checked by the Nano/LightChain upon receipt of a ChainProof.

        // Check that all headers in the chain are valid successors of one another.
        for (let i = this._headers.length - 1; i >= 1; i--) {
            if (!(await this._headers[i].isImmediateSuccessorOf(this._headers[i - 1]))) { // eslint-disable-line no-await-in-loop
                return false;
            }
        }

        // Everything checks out.
        return true;
    }

    /**
     * @returns {string}
     */
    toString() {
        return `HeaderChain{length=${this.length}}`;
    }

    /** @type {number} */
    get length() {
        return this._headers.length;
    }

    /** @type {Array.<BlockHeader>} */
    get headers() {
        return this._headers;
    }

    /** @type {BlockHeader} */
    get head() {
        return this._headers[this.length - 1];
    }

    /** @type {BlockHeader} */
    get tail() {
        return this._headers[0];
    }

    /**
     * @returns {number}
     */
    totalDifficulty() {
        return this._headers.reduce((sum, header) => sum + BlockUtils.targetToDifficulty(header.target), 0);
    }
}
Class.register(HeaderChain);
