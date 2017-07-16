class Mempool extends Observable {
    /**
     * @param {Blockchain} blockchain
     * @param {Accounts} accounts
     */
    constructor(blockchain, accounts) {
        super();
        /** @type {Blockchain} */
        this._blockchain = blockchain;
        /** @type {Accounts} */
        this._accounts = accounts;

        // Our pool of transactions.
        /** @type {object} */
        this._transactions = {};

        // All public keys of transaction senders currently in the pool.
        /** @type {object} */
        this._senderPubKeys = {};

        // Listen for changes in the blockchain head to evict transactions that
        // have become invalid.
        blockchain.on('head-changed', () => this._evictTransactions());
    }

    /**
     * @param {Transaction} transaction
     * @fires Mempool#transaction-added
     * @return {Promise.<boolean>}
     */
    async pushTransaction(transaction) {
        // Check if we already know this transaction.
        const hash = await transaction.hash();
        if (this._transactions[hash]) {
            Log.v(Mempool, `Ignoring known transaction ${hash.toBase64()}`);
            return false;
        }

        // Fully verify the transaction against the current accounts state.
        if (!(await this._verifyTransaction(transaction))) {
            return false;
        }

        // Only allow one transaction per senderPubKey at a time.
        // TODO This is a major limitation!
        if (this._senderPubKeys[transaction.senderPubKey]) {
            Log.w(Mempool, 'Rejecting transaction - duplicate sender public key');
            return false;
        }
        this._senderPubKeys[transaction.senderPubKey] = true;

        // Transaction is valid, add it to the mempool.
        this._transactions[hash] = transaction;

        // Tell listeners about the new valid transaction we received.
        this.fire('transaction-added', transaction);

        return true;
    }

    // Currently not asynchronous, but might be in the future.
    /**
     * @param {string} hash
     * @return {Transaction}
     */
    getTransaction(hash) {
        return this._transactions[hash];
    }

    // Currently not asynchronous, but might be in the future.
    /**
     * @param {number} maxCount
     * @return {Array.<Transaction>}
     */
    getTransactions(maxCount = 5000) {
        // TODO Add logic here to pick the "best" transactions.
        const transactions = [];
        for (const hash in this._transactions) {
            if (transactions.length >= maxCount) break;
            transactions.push(this._transactions[hash]);
        }
        return transactions;
    }

    /**
     * @param {Transaction} transaction
     * @return {Promise.<boolean>}
     * @private
     */
    async _verifyTransaction(transaction) {
        // Verify transaction signature.
        if (!(await transaction.verifySignature())) {
            Log.w(Mempool, 'Rejected transaction - invalid signature', transaction);
            return false;
        }

        // Do not allow transactions where sender and recipient coincide.
        const senderAddr = await transaction.getSenderAddr();
        if (transaction.recipientAddr.equals(senderAddr)) {
            Log.w(Mempool, 'Rejecting transaction - sender and recipient coincide');
            return false;
        }

        // Verify transaction balance.
        return this._verifyTransactionBalance(transaction);
    }

    /**
     * @param {Transaction} transaction
     * @param {boolean} quiet
     * @return {Promise.<boolean>}
     * @private
     */
    async _verifyTransactionBalance(transaction, quiet = false) {
        // Verify balance and nonce:
        // - sender account balance must be greater or equal the transaction value + fee.
        // - sender account nonce must match the transaction nonce.
        const senderAddr = await transaction.getSenderAddr();
        const senderBalance = await this._accounts.getBalance(senderAddr);
        if (senderBalance.value < (transaction.value + transaction.fee)) {
            if (!quiet) Log.w(Mempool, 'Rejected transaction - insufficient funds', transaction);
            return false;
        }

        if (senderBalance.nonce !== transaction.nonce) {
            if (!quiet) Log.w(Mempool, 'Rejected transaction - invalid nonce', transaction);
            return false;
        }

        // Everything checks out.
        return true;
    }

    /**
     * @fires Mempool#transaction-ready
     * @return {Promise}
     * @private
     */
    async _evictTransactions() {
        // Evict all transactions from the pool that have become invalid due
        // to changes in the account state (i.e. typically because the were included
        // in a newly mined block). No need to re-check signatures.
        for (const hash in this._transactions) {
            const transaction = this._transactions[hash];
            if (!(await this._verifyTransactionBalance(transaction, true))) { // eslint-disable-line no-await-in-loop
                delete this._transactions[hash];
                delete this._senderPubKeys[transaction.senderPubKey];
            }
        }

        // Tell listeners that the pool has updated after a blockchain head change.
        /**
         * @event Mempool#transaction-ready
         */
        this.fire('transactions-ready');
    }
}
Class.register(Mempool);
