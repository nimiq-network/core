class Consensus extends Observable {
    /**
     * 
     * @param {Blockchain} blockchain
     * @param {Mempool} mempool
     * @param {Network} network
     */
    constructor(blockchain, mempool, network) {
        super();
        /** @type {Blockchain} */
        this._blockchain = blockchain;
        /** @type {Mempool} */
        this._mempool = mempool;

        /** @type {HashMap.<Peer,ConsensusAgent>} */
        this._agents = new HashMap();
        /** @type {Timers} */
        this._timers = new Timers();
        /** @type {boolean} */
        this._syncing = false;
        /** @type {boolean} */
        this._established = false;

        network.on('peer-joined', peer => this._onPeerJoined(peer));
        network.on('peer-left', peer => this._onPeerLeft(peer));

        // Notify peers when our blockchain head changes.
        blockchain.on('head-changed', head => {
            // Don't announce head changes if we are not synced yet.
            if (!this._established) return;

            for (const agent of this._agents.values()) {
                agent.relayBlock(head);
            }
        });

        // Relay new (verified) transactions to peers.
        mempool.on('transaction-added', tx => {
            // Don't relay transactions if we are not synced yet.
            if (!this._established) return;

            for (const agent of this._agents.values()) {
                agent.relayTransaction(tx);
            }
        });
    }

    /**
     * @param {Peer} peer
     * @private
     */
    _onPeerJoined(peer) {
        // Create a ConsensusAgent for each peer that connects.
        const agent = new ConsensusAgent(this._blockchain, this._mempool, peer);
        this._agents.put(peer.id, agent);

        // If no more peers connect within the specified timeout, start syncing.
        this._timers.resetTimeout('sync', this._syncBlockchain.bind(this), Consensus.SYNC_THROTTLE);
    }

    /**
     * @param {Peer} peer
     * @private
     */
    _onPeerLeft(peer) {
        this._agents.remove(peer.id);
    }

    /**
     * @private
     */
    _syncBlockchain() {
        // Wait for ongoing sync to finish.
        if (this._syncing) {
            return;
        }

        // Find the peers with the hardest chain that aren't sync'd yet.
        let bestTotalWork = -1;
        let bestAgents = [];
        for (const agent of this._agents.values()) {
            if (!agent.synced && agent.peer.totalWork > bestTotalWork) {
                bestTotalWork = agent.peer.totalWork;
                bestAgents = [agent];
            } else if (!agent.synced && agent.peer.totalWork === bestTotalWork) {
                bestAgents.push(agent);
            }
        }
        // Choose a random peer from those.
        let bestAgent = null;
        if (bestAgents.length > 0) {
            bestAgent = bestAgents[Math.floor(Math.random() * bestAgents.length)];
        }

        if (!bestAgent) {
            // We are synced with all connected peers.
            this._syncing = false;

            if (this._agents.length > 0) {
                // Report consensus-established if we have at least one connected peer.
                Log.d(Consensus, `Synced with all connected peers (${this._agents.length}), consensus established.`);
                Log.d(Consensus, `Blockchain: height=${this._blockchain.height}, totalWork=${this._blockchain.totalWork}, headHash=${this._blockchain.headHash}`);

                this._established = true;
                this.fire('established');
            } else {
                // We are not connected to any peers anymore. Report consensus-lost.
                this._established = false;
                this.fire('lost');
            }

            return;
        }

        Log.v(Consensus, `Syncing blockchain with peer ${bestAgent.peer.peerAddress}`);

        this._syncing = true;

        // If we expect this sync to change our blockchain height, tell listeners about it.
        if (bestAgent.peer.startHeight > this._blockchain.height) {
            this.fire('syncing', bestAgent.peer.startHeight);
        }

        bestAgent.on('sync', () => this._onPeerSynced());
        bestAgent.on('close', () => {
            this._onPeerLeft(bestAgent.peer);
            this._onPeerSynced();
        });
        bestAgent.syncBlockchain();
    }

    /**
     * @private
     */
    _onPeerSynced() {
        this._syncing = false;
        this._syncBlockchain();
    }

    /** @type {boolean} */
    get established() {
        return this._established;
    }
    
    /** @type {number} */
    static get SYNC_THROTTLE() {
        return 1500;
    }

    // TODO confidence level?
}
Class.register(Consensus);
