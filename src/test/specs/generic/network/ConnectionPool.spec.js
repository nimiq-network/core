describe('ConnectionPool', () => {
    const peerCountMax = Network.PEER_COUNT_MAX;
    const peerCountRecyclingActive = Network.PEER_COUNT_RECYCLING_ACTIVE;
    const seedPeers = PeerAddressBook.SEED_PEERS;

    beforeEach(function () {
        MockClock.install();
        MockNetwork.install(20); // 20ms latency

        PeerAddressBook.SEED_PEERS = [];
        Network.PEER_COUNT_MAX = 5;
    });

    afterEach(function () {
        MockClock.uninstall();
        MockNetwork.uninstall();

        PeerAddressBook.SEED_PEERS = seedPeers;
        Network.PEER_COUNT_MAX = peerCountMax;
    });

    it('should automatically recycle existing connections', (done) => {
        async function createPeers(count, seedAddress) {
            while (count-- > 0) {
                const netConfig = new RtcNetworkConfig();
                const consensus = await Consensus.volatileNano(netConfig);
                consensus.network._connections.connectOutbound(seedAddress);
                await new Promise(resolve => consensus.on('established', resolve));
            }
        }

        (async () => {
            Network.PEER_COUNT_RECYCLING_ACTIVE = 4;
            MockClock.speed = 20;

            const netConfig1 = new WsNetworkConfig('node1.test', 9000, 'key1', 'cert1');
            const consensus1 = await Consensus.volatileFull(netConfig1);
            consensus1.network.connect();

            await createPeers(5, netConfig1.peerAddress);

            expect(consensus1.network.peerCount).toBe(5);

            // Trigger Network housekeeping. This should recycle connections.
            MockClock.tick(6 * 60 * 1000);

            expect(consensus1.network.peerCount).toBe(4);
            Network.PEER_COUNT_RECYCLING_ACTIVE = peerCountRecyclingActive;

            done();
        })().catch(done.fail);
    });

    it('should recycle connections in exchange for inbound connections', (done) => {
        async function createPeers(count, seedAddress) {
            while (count-- > 0) {
                const netConfig = new RtcNetworkConfig();
                const consensus = await Consensus.volatileNano(netConfig);
                consensus.network._connections.connectOutbound(seedAddress);
                await new Promise(resolve => consensus.on('established', resolve));
            }
        }

        (async () => {
            Network.PEER_COUNT_RECYCLING_ACTIVE = 5;
            MockClock.speed = 20;

            const netConfig1 = new WsNetworkConfig('node1.test', 9000, 'key1', 'cert1');
            const consensus1 = await Consensus.volatileFull(netConfig1);
            consensus1.network.connect();

            await createPeers(5, netConfig1.peerAddress);

            expect(consensus1.network.peerCount).toBe(5);

            // Advance the clock to make connection scores drop below the inbound exchange threshold.
            MockClock.tick(15 * 60 * 1000);

            await createPeers(1, netConfig1.peerAddress);

            expect(consensus1.network.peerCount).toBe(5);

            Network.PEER_COUNT_RECYCLING_ACTIVE = peerCountRecyclingActive;
            done();
        })().catch(done.fail);
    });

    it('should reject duplicate connections to the same peer address', (done) => {
        (async () => {
            MockClock.speed = 20;

            const netConfig1 = new WsNetworkConfig('node1.test', 9000, 'key1', 'cert1');
            const consensus1 = await Consensus.volatileFull(netConfig1);
            consensus1.network.connect();

            PeerAddressBook.SEED_PEERS = [WsPeerAddress.seed('node1.test', 9000, netConfig1.publicKey.toHex())];

            const netConfig2 = new RtcNetworkConfig();
            const consensus2 = await Consensus.volatileLight(netConfig2);
            consensus2.network.connect();

            await new Promise(resolve => consensus2.on('established', resolve));
            expect(consensus1.network.peerCount).toBe(1);

            // Try to connect the same peer again.
            const duplicate = await Consensus.volatileLight(netConfig2);
            const disconnected = new Promise(resolve => duplicate.network.on('disconnected', resolve));
            duplicate.on('established', done.fail);
            duplicate.network.connect();
            await disconnected;

            expect(duplicate.established).toBe(false);
            expect(consensus1.network.peerCount).toBe(1);

            // Try a second time.
            const duplicate2 = await Consensus.volatileLight(netConfig2);
            const disconnected2 = new Promise(resolve => duplicate2.network.on('disconnected', resolve));
            duplicate2.on('established', done.fail);
            duplicate2.network.connect();
            await disconnected2;

            expect(duplicate.established).toBe(false);
            expect(consensus1.network.peerCount).toBe(1);

            expect(consensus2.established).toBe(true);
            done();
        })().catch(done.fail);
    });
});
