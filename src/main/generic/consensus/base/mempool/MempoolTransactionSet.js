class MempoolTransactionSet {
    constructor() {
        /** @type {Array.<Transaction>} */
        this._transactions = [];
    }

    /**
     * @param {Transaction} transaction
     * @return {MempoolTransactionSet}
     */
    add(transaction) {
        this._transactions.push(transaction);
        return this;
    }

    /** @type {Array.<Transaction>} */
    get transactions() {
        return this._transactions;
    }

    /** @type {number} */
    get serializedSize() {
        return this._transactions.map(t => t.serializedSize).reduce((a, b) => a + b, 0);
    }

    /** @type {number} */
    get value() {
        return this._transactions.map(t => t.value).reduce((a, b) => a + b, 0);
    }

    /** @type {number} */
    get fee() {
        return this._transactions.map(t => t.fee).reduce((a, b) => a + b, 0);
    }

    /** @type {Address} */
    get sender() {
        return this._transactions.length > 0 ? this._transactions[0].sender : null;
    }

    /** @type {?Account.Type} */
    get senderType() {
        return this._transactions.length > 0 ? this._transactions[0].senderType : undefined;
    }

    /** @type {number} */
    get length() {
        return this._transactions.length;
    }

    /** @type {number} */
    get nonce() {
        return this._transactions[0].nonce;
    }

    /**
     * @param {number} feePerByte
     * @return {number}
     */
    numBelowFeePerByte(feePerByte) {
        return this._transactions.filter(t => t.fee/t.serializedSize < feePerByte).length;
    }

    /**
     * @return {Transaction}
     */
    shift() {
        return this._transactions.shift();
    }

    /**
     * @param {MempoolTransactionSet} o
     * @return {number}
     */
    compare(o) {
        if (this.fee/this.serializedSize > o.fee/o.serializedSize) return -1;
        if (this.fee/this.serializedSize < o.fee/o.serializedSize) return 1;
        if (this.serializedSize > o.serializedSize) return -1;
        if (this.serializedSize < o.serializedSize) return 1;
        if (this.fee > o.fee) return -1;
        if (this.fee < o.fee) return 1;
        if (this.value > o.value) return -1;
        if (this.value < o.value) return 1;
        return this.transactions[0].compareBlockOrder(o.transactions[0]);
    }

    toString() {
        return `MempoolTransactionSet{senderKey=${this.senderPubKey}, length=${this.length}, value=${this.value}, fee=${this.fee}}`;
    }
}

Class.register(MempoolTransactionSet);
