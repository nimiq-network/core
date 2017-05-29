class InvVector {
    static async fromBlock(block) {
        const hash = await block.hash();
        return new InvVector(InvVector.Type.BLOCK, hash);
    }

    static async fromTransaction(tx) {
        const hash = await tx.hash();
        return new InvVector(InvVector.Type.TRANSACTION, hash);
    }

    constructor(type, hash) {
        this._type = type;
        this._hash = hash;
    }

    static unserialize(buf) {
        let type = buf.readUint32();
        let hash = Hash.unserialize(buf);
        return new InvVector(type, hash);
    }

    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.writeUint32(this._type);
        this._hash.serialize(buf);
        return buf;
    }

    equals(o) {
        return o instanceof InvVector
            && this._type == o.type
            && this._hash.equals(o.hash);
    }

    toString() {
        return "InvVector{type=" + this._type + ", hash=" + this.hash + "}";
    }

    get serializedSize() {
        return /*invType*/ 4
            + this._hash.serializedSize;
    }

    get type() {
        return this._type;
    }

    get hash() {
        return this._hash;
    }
}
InvVector.Type = {
    ERROR: 0,
    TRANSACTION: 1,
    BLOCK: 2
};
Class.register(InvVector);

class BaseInventoryMessage extends Message {
    constructor(type, vectors) {
        super(type);
        if (!vectors || !NumberUtils.isUint16(vectors.length)
            || vectors.some(it => !(it instanceof InvVector))) throw 'Malformed vectors';
        this._vectors = vectors;
    }

    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        super.serialize(buf);
        buf.writeUint16(this._vectors.length);
        for (let vector of this._vectors) {
            vector.serialize(buf);
        }
        return buf;
    }

    get serializedSize() {
        let size = super.serializedSize
            + /*count*/ 2;
        for (let vector of this._vectors) {
            size += vector.serializedSize;
        }
        return size;
    }

    get vectors() {
        return this._vectors;
    }
}
Class.register(BaseInventoryMessage);

class InvMessage extends BaseInventoryMessage {
    constructor(vectors) {
        super(Message.Type.INV, vectors);
    }

    static unserialize(buf) {
        Message.unserialize(buf);
        const count = buf.readUint16();
        const vectors = [];
        for (let i = 0; i < count; ++i) {
            vectors.push(InvVector.unserialize(buf));
        }
        return new InvMessage(vectors);
    }
}
Class.register(InvMessage);

class GetDataMessage extends BaseInventoryMessage {
    constructor(vectors) {
        super(Message.Type.GETDATA, vectors);
    }

    static unserialize(buf) {
        Message.unserialize(buf);
        const count = buf.readUint16();
        const vectors = [];
        for (let i = 0; i < count; ++i) {
            vectors.push(InvVector.unserialize(buf));
        }
        return new GetDataMessage(vectors);
    }
}

Class.register(GetDataMessage);

class NotFoundMessage extends BaseInventoryMessage {
    constructor(vectors) {
        super(Message.Type.NOTFOUND, vectors);
    }

    static unserialize(buf) {
        Message.unserialize(buf);
        const count = buf.readUint16();
        const vectors = [];
        for (let i = 0; i < count; ++i) {
            vectors.push(InvVector.unserialize(buf));
        }
        return new NotFoundMessage(vectors);
    }
}
Class.register(NotFoundMessage);
