class Signature extends Primitive {
    /**
     * @param {{_obj}} o
     * @returns {Signature}
     */
    static copy(o) {
        if (!o) return o;
        const obj = new Uint8Array(o._obj);
        return new Signature(obj);
    }

    /**
     * @param arg
     * @private
     */
    constructor(arg) {
        super(arg, Crypto.signatureType, Crypto.signatureSize);
    }

    /**
     * @param {PrivateKey} privateKey
     * @param {PublicKey} publicKey
     * @param {Uint8Array} data
     * @return {Promise.<Signature>}
     */
    static async create(privateKey, publicKey, data) {
        return new Signature(await Crypto.signatureCreate(privateKey._obj, publicKey._obj, data));
    }

    /**
     * @param {SerialBuffer} buf
     * @return {Signature}
     */
    static unserialize(buf) {
        return new Signature(Crypto.signatureUnserialize(buf.read(Crypto.signatureSize)));
    }

    /**
     * @param {SerialBuffer} [buf]
     * @return {SerialBuffer}
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(Crypto.signatureSerialize(this._obj));
        return buf;
    }

    /** @type {number} */
    get serializedSize() {
        return Crypto.signatureSize;
    }

    /**
     * @param {PublicKey} publicKey
     * @param {Uint8Array} data
     * @return {Promise.<boolean>}
     */
    verify(publicKey, data) {
        return Crypto.signatureVerify(publicKey._obj, data, this._obj);
    }

    /**
     * @param {Primitive} o
     * @return {boolean}
     */
    equals(o) {
        return o instanceof Signature && super.equals(o);
    }
}
Class.register(Signature);
