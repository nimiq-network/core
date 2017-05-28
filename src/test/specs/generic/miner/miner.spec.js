describe('Miner', () => {
    const minerAddress = new Address(Dummy.address1);

    const prevHash = new Hash(Dummy.hash1);
    const bodyHash = new Hash(Dummy.hash2);
    const accountsHash = new Hash(Dummy.hash3);
    const difficulty = BlockUtils.difficultyToCompact(3);
    const timestamp = 88888888;
    const nonce = 0;
    const currHeader = new BlockHeader(prevHash,bodyHash,accountsHash,difficulty,timestamp,nonce);

    // it('can mine a next BlockHeader', (done) => {

    //     async function pushBlockTest(nextBlock){
    //         expect(true).toBe(false);
    //         const nextHeader = nextBlock.header;
    //         const currPrevHash = await currHeader.hash();
    //         const nextBody = nextBlock.body;
    //         const isPOW = await nextHeader.verify();

    //         expect(nextHeader.difficulty).toBe(difficulty-1);
    //         expect(nextHeader.prevHash.equals(currPrevHash)).toBe(true);
    //         expect(nextHeader.accountsHash.equals(currAccountsHash)).toBe(true);
    //         expect(nextBody.minerAddr.equals(minerAddress)).toBe(true);
    //         expect(isPOW).toBe(true);

    //         done();
    //     }

    //     const currAccountsHash = new Hash(Dummy.hash1);
    //     const spy = new BlockchainSpy(pushBlockTest, currAccountsHash);
    //     const miner = new Miner(spy,minerAddress);

    //     spy.fire('head-changed',currHeader);
    // });

});

class BlockchainSpy extends Observable{
    constructor(pushBlock, accountsHash){
        super();
        this.pushBlock = pushBlock;
        this._hash = accountsHash;
    }

    getAccountsHash(){
        return this._hash;
    }
}
