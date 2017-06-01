describe('PeerChannel', () => {
    const type = 42;
    const hash = new Hash(Dummy.hash1);
    const vec1 = new InvVector(type, hash);
    const count = 1;
    const message = new InvMessage([vec1]);
    const addr = new WsPeerAddress(Services.WEBSOCKET, Date.now(), 'node1.nimiq.com', 8443);

    it('can send a VersionMessage', (done) => {
        const spy = new SpyConnection(msg => {
            const vMsg = VersionMessage.unserialize(msg);
            expect(vMsg.version).toBe(1);
            expect(vMsg.peerAddress.equals(addr)).toBe(true);
            expect(vMsg.startHeight).toBe(42);
            done();
        });
        const client = new PeerChannel(spy);
        client.version(addr, 42);
    });

    it('can send a InvMessage', (done) => {
        const spy = new SpyConnection(msg => {
            const invMsg = InvMessage.unserialize(msg);
            expect(invMsg.vectors.length).toBe(1);
            expect(invMsg.vectors[0].equals(vec1)).toBe(true);
            done();
        });
        const client = new PeerChannel(spy);
        client.inv([vec1]);
    });

    it('can send a NotFoundMessage', (done) => {
        const spy = new SpyConnection(msg => {
            const notFoundMsg = NotFoundMessage.unserialize(msg);
            expect(notFoundMsg.vectors.length).toBe(1);
            expect(notFoundMsg.vectors[0].equals(vec1)).toBe(true);
            done();
        });
        const client = new PeerChannel(spy);
        client.notfound([vec1]);
    });

    it('can send a GetDataMessage', (done) => {
        const spy = new SpyConnection(msg => {
            const getDataMsg = GetDataMessage.unserialize(msg);
            expect(getDataMsg.vectors.length).toBe(1);
            expect(getDataMsg.vectors[0].equals(vec1)).toBe(true);
            done();
        });
        const client = new PeerChannel(spy);
        client.getdata([vec1]);
    });

    it('can send a BlockMessage', (done) => {
        (async function () {
            const testBlockchain = await TestBlockchain.createVolatileTest(0);
            const block = await testBlockchain.createBlock();
            const spy = new SpyConnection(msg => {
                const blockMsg = BlockMessage.unserialize(msg);
                expect(blockMsg.block.header.equals(block.header)).toBe(true);
                expect(blockMsg.block.body.equals(block.body)).toBe(true);
            });
            const client = new PeerChannel(spy);
            client.block(block);
        })().then(done, done.fail);
    });

    it('can send a TxMessage', (done) => {
        (async function () {
            const testBlockchain = await TestBlockchain.createVolatileTest(0);
            const block = await testBlockchain.createBlock();
            const spy = new SpyConnection(msg => {
                const txMsg = TxMessage.unserialize(msg);
                expect(txMsg.transaction.equals(block.transactions[0])).toBe(true);
            });
            const client = new PeerChannel(spy);
            client.tx(block.transactions[0]);
        })().then(done, done.fail);
    });

    it('can receive a InvMessage', (done) => {
        const message = new InvMessage([vec1]);
        const spy = new SpyConnection();
        const client = new PeerChannel(spy);

        client.on(message.type, invMsgTest => {
            expect(invMsgTest.vectors.length).toBe(count);
            expect(invMsgTest.vectors[0].equals(vec1)).toBe(true);
            done();
        });
        spy.onmessage(message.serialize());
    });

    it('can receive a NotFoundMessage', (done) => {
        const message = new NotFoundMessage([vec1]);
        const spy = new SpyConnection();
        const client = new PeerChannel(spy);

        client.on(message.type, notfoundMsgTest => {
            expect(notfoundMsgTest.vectors.length).toBe(count);
            expect(notfoundMsgTest.vectors[0].equals(vec1)).toBe(true);
            done();
        });
        spy.onmessage(message.serialize());
    });

    it('can receive a GetDataMessage', (done) => {
        const message = new GetDataMessage([vec1]);
        const spy = new SpyConnection();
        const client = new PeerChannel(spy);

        client.on(message.type, getDataMsgTest => {
            expect(getDataMsgTest.vectors.length).toBe(count);
            expect(getDataMsgTest.vectors[0].equals(vec1)).toBe(true);
            done();
        });
        spy.onmessage(message.serialize());
    });

    it('can receive a BlockMessage', (done) => {
        (async function () {
            const testBlockchain = await TestBlockchain.createVolatileTest(0);
            const block = await testBlockchain.createBlock();
            const message = new BlockMessage(block);
            console.log(message);
            const spy = new SpyConnection();
            const client = new PeerChannel(spy);
            client.on(message.type, blockMsgTest => {
                expect(blockMsgTest.block.header.equals(block.header)).toBe(true);
                expect(blockMsgTest.block.body.equals(block.body)).toBe(true);
            });
            spy.onmessage(message.serialize());
        })().then(done, done.fail);
    });

    it('can receive a TxMessage', (done) => {
        (async function () {
            const testBlockchain = await TestBlockchain.createVolatileTest(0);
            const block = await testBlockchain.createBlock();
            const message = new TxMessage(block.transactions[0]);
            const spy = new SpyConnection();
            const client = new PeerChannel(spy);
            client.on(message.type, txMsgTest => {
                expect(txMsgTest.transaction.equals(block.transactions[0])).toBe(true);
            });
            spy.onmessage(message.serialize());
        })().then(done, done.fail);
    });
});
class SpyConnection extends Observable {
    constructor(send) {
        super();
        this.send = send || (() => {});
        this.onmessage = ( (msg) => {
            this.fire('message', msg);
        } );
    }
}
