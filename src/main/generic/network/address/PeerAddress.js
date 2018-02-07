class PeerAddress {
    /**
     * @param {number} protocol
     * @param {number} services
     * @param {number} timestamp
     * @param {NetAddress} netAddress
     * @param {PublicKey} publicKey
     * @param {number} distance
     * @param {Signature} [signature]
     */
    constructor(protocol, services, timestamp, netAddress, publicKey, distance, signature) {
        if (!NumberUtils.isUint8(distance)) throw new Error('Malformed distance');
        if (publicKey !== null && !(publicKey instanceof PublicKey)) throw new Error('Malformed publicKey');

        /** @type {number} */
        this._protocol = protocol;
        /** @type {number} */
        this._services = services;
        /** @type {number} */
        this._timestamp = timestamp;
        /** @type {NetAddress} */
        this._netAddress = netAddress || NetAddress.UNSPECIFIED;
        /** @type {PublicKey} */
        this._publicKey = publicKey;
        /** @type {number} */
        this._distance = distance;
        /** @type {?Signature} */
        this._signature = signature;
    }

    /**
     * @param {SerialBuffer} buf
     * @returns {PeerAddress}
     */
    static unserialize(buf) {
        const protocol = buf.readUint8();
        switch (protocol) {
            case Protocol.WS:
                return WsPeerAddress.unserialize(buf);

            case Protocol.RTC:
                return RtcPeerAddress.unserialize(buf);

            case Protocol.DUMB:
                return DumbPeerAddress.unserialize(buf);

            default:
                throw `Malformed PeerAddress protocol ${protocol}`;
        }
    }

    /**
     * @param {SerialBuffer} [buf]
     * @returns {SerialBuffer}
     */
    serialize(buf) {
        if (!this._publicKey) throw new Error('PeerAddress without publicKey may not be serialized.');
        if (!this._signature) throw new Error('PeerAddress without signature may not be serialized.');

        buf = buf || new SerialBuffer(this.serializedSize);
        buf.writeUint8(this._protocol);
        buf.writeUint32(this._services);
        buf.writeUint64(this._timestamp);

        // Never serialize private netAddresses.
        if (this._netAddress.isPrivate()) {
            NetAddress.UNSPECIFIED.serialize(buf);
        } else {
            this._netAddress.serialize(buf);
        }

        this._publicKey.serialize(buf);
        buf.writeUint8(this._distance);
        this._signature.serialize(buf);

        return buf;
    }

    serializeContent(buf) {
        buf = buf || new SerialBuffer(this.serializedContentSize);

        buf.writeUint8(this._protocol);
        buf.writeUint32(this._services);
        buf.writeUint64(this._timestamp);

        return buf;
    }

    /** @type {number} */
    get serializedSize() {
        return /*protocol*/ 1
            + /*services*/ 4
            + /*timestamp*/ 8
            + this._netAddress.serializedSize
            + this._publicKey.serializedSize
            + /*distance*/ 1
            + this._signature.serializedSize;
    }

    /** @type {number} */
    get serializedContentSize() {
        return /*protocol*/ 1
            + /*services*/ 4
            + /*timestamp*/ 8;
    }

    /**
     * @param {PeerAddress|*} o
     * @returns {boolean}
     */
    equals(o) {
        // We consider peer addresses to be equal if the public key or peer id is not known on one of them:
        // Peers from the network always contain a peer id and public key, peers without peer id or public key
        // are always set by the user.
        return o instanceof PeerAddress
            && this.protocol === o.protocol
            && (!this.publicKey || !o.publicKey || this.publicKey.equals(o.publicKey))
            && (!this.peerId || !o.peerId || this.peerId.equals(o.peerId));
            /* services is ignored */
            /* timestamp is ignored */
            /* netAddress is ignored */
            /* distance is ignored */
    }

    /**
     * @returns {boolean}
     */
    verifySignature() {
        if (this._signatureVerified === undefined) {
            this._signatureVerified = this.signature.verify(this.publicKey, this.serializeContent());
        }
        return this._signatureVerified;
    }

    /** @type {number} */
    get protocol() {
        return this._protocol;
    }

    /** @type {number} */
    get services() {
        return this._services;
    }

    /** @type {number} */
    get timestamp() {
        return this._timestamp;
    }

    /** @type {NetAddress} */
    get netAddress() {
        return this._netAddress.isPseudo() ? null : this._netAddress;
    }

    /** @type {NetAddress} */
    set netAddress(value) {
        this._netAddress = value || NetAddress.UNSPECIFIED;
    }

    /** @type {PublicKey} */
    get publicKey() {
        return this._publicKey;
    }

    /** @type {PeerId} */
    get peerId() {
        return this._publicKey ? this._publicKey.toPeerId() : null;
    }

    /** @type {number} */
    get distance() {
        return this._distance;
    }

    /** @type {Signature} */
    get signature() {
        return this._signature;
    }

    /** @type {Signature} */
    set signature(signature) {
        // Never change the signature of a remote address.
        if (this._distance !== 0) {
            return;
        }

        this._signature = signature;
        this._signatureVerified = undefined;
    }

    // Changed when passed on to other peers.
    /** @type {number} */
    set distance(value) {
        this._distance = value;
    }

    /**
     * @returns {boolean}
     */
    isSeed() {
        return this._timestamp === 0;
    }
}

Class.register(PeerAddress);

class WsPeerAddress extends PeerAddress {
    /**
     * @param {string} host
     * @param {number} port
     * @param {string} [publicKeyHex]
     * @returns {WsPeerAddress}
     */
    static seed(host, port, publicKeyHex) {
        const publicKey = publicKeyHex ? new PublicKey(BufferUtils.fromHex(publicKeyHex)) : null;
        return new WsPeerAddress(Services.FULL, /*timestamp*/ 0, NetAddress.UNSPECIFIED, publicKey, 0, host, port);
    }

    /**
     * @param {number} services
     * @param {number} timestamp
     * @param {NetAddress} netAddress
     * @param {PublicKey} publicKey
     * @param {number} distance
     * @param {string} host
     * @param {number} port
     * @param {Signature} [signature]
     */
    constructor(services, timestamp, netAddress, publicKey, distance, host, port, signature) {
        super(Protocol.WS, services, timestamp, netAddress, publicKey, distance, signature);
        if (!host) throw new Error('Malformed host');
        if (!NumberUtils.isUint16(port)) throw new Error('Malformed port');
        this._host = host;
        this._port = port;
    }

    /**
     * @param {SerialBuffer} buf
     * @returns {WsPeerAddress}
     */
    static unserialize(buf) {
        const services = buf.readUint32();
        const timestamp = buf.readUint64();
        const netAddress = NetAddress.unserialize(buf);
        const publicKey = PublicKey.unserialize(buf);
        const distance = buf.readUint8();
        const signature = Signature.unserialize(buf);
        const host = buf.readVarLengthString();
        const port = buf.readUint16();
        return new WsPeerAddress(services, timestamp, netAddress, publicKey, distance, host, port, signature);
    }

    /**
     * @param {SerialBuffer} [buf]
     * @returns {SerialBuffer}
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        super.serialize(buf);
        buf.writeVarLengthString(this._host);
        buf.writeUint16(this._port);
        return buf;
    }

    /**
     * @param {SerialBuffer} [buf]
     * @returns {SerialBuffer}
     */
    serializeContent(buf) {
        buf = buf || new SerialBuffer(this.serializedContentSize);
        super.serializeContent(buf);
        buf.writeVarLengthString(this._host);
        buf.writeUint16(this._port);
        return buf;
    }

    /** @type {number} */
    get serializedSize() {
        return super.serializedSize
            + SerialBuffer.varLengthStringSize(this._host)
            + /*port*/ 2;
    }

    /** @type {number} */
    get serializedContentSize() {
        return super.serializedContentSize
            + SerialBuffer.varLengthStringSize(this._host)
            + /*port*/ 2;
    }

    /**
     * @override
     * @param {PeerAddress|*} o
     * @returns {boolean}
     */
    equals(o) {
        return super.equals(o)
            && o instanceof WsPeerAddress
            && this._host === o.host
            && this._port === o.port;
    }

    /**
     * @returns {string}
     */
    hashCode() {
        return this.toString();
    }

    /**
     * @returns {WsPeerAddress}
     */
    withoutId() {
        return new WsPeerAddress(this.services, this.timestamp, this.netAddress, null, this.distance, this.host, this.port);
    }

    /**
     * @returns {string}
     */
    toString() {
        return `wss://${this._host}:${this._port}/${this.peerId ? this.peerId : ''}`;
    }

    /** @type {string} */
    get host() {
        return this._host;
    }

    /** @type {number} */
    get port() {
        return this._port;
    }
}

Class.register(WsPeerAddress);

class RtcPeerAddress extends PeerAddress {
    /**
     * @param {number} services
     * @param {number} timestamp
     * @param {NetAddress} netAddress
     * @param {PublicKey} publicKey
     * @param {number} distance
     * @param {Signature} [signature]
     */
    constructor(services, timestamp, netAddress, publicKey, distance, signature) {
        super(Protocol.RTC, services, timestamp, netAddress, publicKey, distance, signature);
    }

    /**
     * @param {SerialBuffer} buf
     * @returns {RtcPeerAddress}
     */
    static unserialize(buf) {
        const services = buf.readUint32();
        const timestamp = buf.readUint64();
        const netAddress = NetAddress.unserialize(buf);
        const publicKey = PublicKey.unserialize(buf);
        const distance = buf.readUint8();
        const signature = Signature.unserialize(buf);
        return new RtcPeerAddress(services, timestamp, netAddress, publicKey, distance, signature);
    }

    /**
     * @param {SerialBuffer} [buf]
     * @returns {SerialBuffer}
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        super.serialize(buf);
        return buf;
    }

    /** @type {number} */
    get serializedSize() {
        return super.serializedSize;
    }

    /**
     * @override
     * @param {PeerAddress|*} o
     * @returns {boolean}
     */
    equals(o) {
        return super.equals(o)
            && o instanceof RtcPeerAddress;
    }

    /**
     * @returns {string}
     */
    hashCode() {
        return this.toString();
    }

    /**
     * @returns {string}
     */
    toString() {
        return `rtc:///${this.peerId}`;
    }
}

Class.register(RtcPeerAddress);

class DumbPeerAddress extends PeerAddress {
    /**
     * @param {number} services
     * @param {number} timestamp
     * @param {NetAddress} netAddress
     * @param {PublicKey} publicKey
     * @param {number} distance
     * @param {Signature} [signature]
     */
    constructor(services, timestamp, netAddress, publicKey, distance, signature) {
        super(Protocol.DUMB, services, timestamp, netAddress, publicKey, distance, signature);
    }

    /**
     * @param {SerialBuffer} buf
     * @returns {DumbPeerAddress}
     */
    static unserialize(buf) {
        const services = buf.readUint32();
        const timestamp = buf.readUint64();
        const netAddress = NetAddress.unserialize(buf);
        const publicKey = PublicKey.unserialize(buf);
        const distance = buf.readUint8();
        const signature = Signature.unserialize(buf);
        return new DumbPeerAddress(services, timestamp, netAddress, publicKey, distance, signature);
    }

    /**
     * @param {SerialBuffer} [buf]
     * @returns {SerialBuffer}
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        super.serialize(buf);
        return buf;
    }

    /** @type {number} */
    get serializedSize() {
        return super.serializedSize;
    }

    /**
     * @override
     * @param {PeerAddress} o
     * @returns {boolean}
     */
    equals(o) {
        return super.equals(o)
            && o instanceof DumbPeerAddress;
    }

    /**
     * @returns {string}
     */
    hashCode() {
        return this.toString();
    }

    /**
     * @returns {string}
     */
    toString() {
        return `dumb:///${this.peerId}`;
    }
}

Class.register(DumbPeerAddress);
