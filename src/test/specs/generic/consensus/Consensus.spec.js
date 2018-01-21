if (PlatformUtils.isBrowser()) {
    describe('Consensus', () => {
        let netconfig;

        beforeAll(() => {
            netconfig = new NetworkConfig(new SignalId(new Uint8Array(SignalId.SERIALIZED_SIZE)));
        });

        it('can instantiate a nano consensus', (done) => {
            (async () => {
                const consensus = await Consensus.nano(netconfig);
                expect(consensus.blockchain.head.equals(Block.GENESIS)).toBeTruthy();
            })().then(done, done.fail);
        });

        it('can instantiate a light consensus', (done) => {
            (async () => {
                const consensus = await Consensus.light(netconfig);
                expect(consensus.blockchain.head.equals(Block.GENESIS)).toBeTruthy();
            })().then(done, done.fail);
        });

        it('can instantiate a full consensus', (done) => {
            (async () => {
                const consensus = await Consensus.full(netconfig);
                expect(consensus.blockchain.head.equals(Block.GENESIS)).toBeTruthy();
            })().then(done, done.fail);
        });
    });
}
