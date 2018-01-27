describe('TransactionCache', () => {
    it('correctly finds transactions', (done) => {
        (async () => {
            const testBlockchain = await TestBlockchain.createVolatileTest(5, 10);

            const block = await testBlockchain.createBlock({numTransactions: 1});
            expect(block.transactions.length).toBe(1);
            const tx = block.transactions[0];

            // Duplicate
            expect(testBlockchain.transactionsCache.missingBlocks).toBe(Policy.TRANSACTION_VALIDITY_WINDOW - 5);
            const cache = testBlockchain.transactionsCache.clone();
            expect(cache.missingBlocks).toBe(Policy.TRANSACTION_VALIDITY_WINDOW - 5);
            expect(cache.transactions.length).toBe(testBlockchain.transactionsCache.transactions.length);

            // New block
            expect(cache.containsTransaction(tx)).toBeFalsy();
            cache.pushBlock(block);
            expect(testBlockchain.transactionsCache.containsTransaction(tx)).toBeFalsy();
            expect(cache.containsTransaction(tx)).toBeTruthy();

            // Revert
            cache.revertBlock(block);
            expect(cache.containsTransaction(tx)).toBeFalsy();

            // Prepend
            cache.prependBlocks([block]);
            expect(cache.containsTransaction(tx)).toBeTruthy();

            // Shift
            cache.shiftBlock();
            expect(cache.containsTransaction(tx)).toBeFalsy();
        })().then(done, done.fail);
    });
});
