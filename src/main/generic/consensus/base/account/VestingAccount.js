class VestingAccount extends Account {
    /**
     * @param {VestingAccount} o
     * @returns {VestingAccount}
     */
    static copy(o) {
        if (!o) return o;
        return new VestingAccount(o._balance, o._vestingStart, o._vestingStepBlocks, o._vestingStepAmount, o._vestingTotalAmount);
    }

    /**
     * @param {number} [balance]
     * @param {number} [vestingStart]
     * @param {number} [vestingStepBlocks]
     * @param {number} [vestingStepAmount]
     * @param {number} [vestingTotalAmount]
     */
    constructor(balance = 0, vestingStart = 0, vestingStepBlocks = 0, vestingStepAmount = balance, vestingTotalAmount = balance) {
        super(Account.Type.VESTING, balance);
        if (!NumberUtils.isUint32(vestingStart)) throw new Error('Malformed vestingStart');
        if (!NumberUtils.isUint32(vestingStepBlocks)) throw new Error('Malformed vestingStepBlocks');
        if (!NumberUtils.isUint64(vestingStepAmount)) throw new Error('Malformed vestingStepAmount');
        if (!NumberUtils.isUint64(vestingTotalAmount)) throw new Error('Malformed lowerCap');

        /** @type {number} */
        this._vestingStart = vestingStart;
        /** @type {number} */
        this._vestingStepBlocks = vestingStepBlocks;
        /** @type {number} */
        this._vestingStepAmount = vestingStepAmount;
        /** @type {number} */
        this._vestingTotalAmount = vestingTotalAmount;
    }

    /**
     * @param {SerialBuffer} buf
     * @return {VestingAccount}
     */
    static unserialize(buf) {
        const type = buf.readUint8();
        if (type !== Account.Type.VESTING) throw new Error('Invalid account type');

        const balance = buf.readUint64();
        const vestingStart = buf.readUint32();
        const vestingStepBlocks = buf.readUint32();
        const vestingStepAmount = buf.readUint64();
        const vestingTotalAmount = buf.readUint64();
        return new VestingAccount(balance, vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount);
    }

    /**
     * Serialize this VestingAccount object into binary form.
     * @param {?SerialBuffer} [buf] Buffer to write to.
     * @return {SerialBuffer} Buffer from `buf` or newly generated one.
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        super.serialize(buf);
        buf.writeUint32(this._vestingStart);
        buf.writeUint32(this._vestingStepBlocks);
        buf.writeUint64(this._vestingStepAmount);
        buf.writeUint64(this._vestingTotalAmount);
        return buf;
    }

    /**
     * @return {number}
     */
    get serializedSize() {
        return /*type*/ 1
            + /*balance*/ 8
            + /*vestingStart*/ 4
            + /*vestingStepBlocks*/ 4
            + /*vestingStepAmount*/ 8
            + /*vestingTotalAmount*/ 8;
    }

    /** @type {number} */
    get vestingStart() {
        return this._vestingStart;
    }

    /** @type {number} */
    get vestingStepBlocks() {
        return this._vestingStepBlocks;
    }

    /** @type {number} */
    get vestingStepAmount() {
        return this._vestingStepAmount;
    }

    /** @type {number} */
    get vestingTotalAmount() {
        return this._vestingTotalAmount;
    }

    toString() {
        return `VestingAccount{balance=${this._balance}}`;
    }

    /**
     * @param {Transaction} transaction
     * @return {Promise.<boolean>}
     */
    static verifyOutgoingTransaction(transaction) {
        return SignatureProof.verifyTransaction(transaction);
    }

    /**
     * @param {Transaction} transaction
     * @return {Promise.<boolean>}
     */
    static verifyIncomingTransaction(transaction) {
        if (transaction.data.length > 0 && transaction.data.length !== 4 && transaction.data.length !== 16 && transaction.data.length !== 24) {
            return Promise.resolve(false);
        }
        return Promise.resolve(true); // Accept
    }

    /**
     * @param {number} balance
     * @return {Account|*}
     */
    withBalance(balance) {
        return new VestingAccount(balance, this._vestingStart, this._vestingStepBlocks, this._vestingStepAmount, this._vestingTotalAmount);
    }

    /**
     * @param {Transaction} transaction
     * @param {number} blockHeight
     * @param {TransactionCache} transactionsCache
     * @param {boolean} [revert]
     * @return {Account|*}
     */
    withOutgoingTransaction(transaction, blockHeight, transactionsCache, revert = false) {
        if (!revert) {
            const minCap = this._vestingStepBlocks && this._vestingStepAmount > 0 ? Math.max(0, this._vestingTotalAmount - Math.floor((blockHeight - this._vestingStart) / this._vestingStepBlocks) * this._vestingStepAmount) : 0;
            const newBalance = this._balance - transaction.value - transaction.fee;
            if (newBalance < minCap) {
                throw new Error('Balance Error!');
            }
        }
        return super.withOutgoingTransaction(transaction, blockHeight, transactionsCache, revert);
    }

    /**
     * @param {Transaction} transaction
     * @param {number} blockHeight
     * @param {boolean} [revert]
     * @return {Account}
     */
    withIncomingTransaction(transaction, blockHeight, revert = false) {
        if (this === VestingAccount.INITIAL && transaction.data.length > 0) {
            /** @type {number} */
            let vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount;
            const buf = new SerialBuffer(transaction.data);
            vestingTotalAmount = transaction.value;
            switch (transaction.data.length) {
                case 4:
                    // Only block number: vest full amount at that block
                    vestingStart = 0;
                    vestingStepBlocks = buf.readUint32();
                    vestingStepAmount = vestingTotalAmount;
                    break;
                case 16:
                    vestingStart = buf.readUint32();
                    vestingStepBlocks = buf.readUint32();
                    vestingStepAmount = buf.readUint64();
                    break;
                case 24:
                    // Create a vesting account with some instantly vested funds
                    vestingStart = buf.readUint32();
                    vestingStepBlocks = buf.readUint32();
                    vestingStepAmount = buf.readUint64();
                    vestingTotalAmount = buf.readUint64();
                    break;
                default:
                    throw new Error('Invalid transaction data');
            }
            return new VestingAccount(transaction.value, vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount);
        } else if (revert && transaction.data.length > 0) {
            return VestingAccount.INITIAL;
        } else if (transaction.data.length > 0) {
            throw new Error('Illegal transaction data');
        }
        return super.withIncomingTransaction(transaction, blockHeight, revert);
    }
}

VestingAccount.INITIAL = new VestingAccount();
Account.TYPE_MAP.set(Account.Type.VESTING, VestingAccount);
Class.register(VestingAccount);
