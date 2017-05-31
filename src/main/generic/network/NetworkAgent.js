class NetworkAgent extends Observable {
    constructor(blockchain, addresses, channel) {
        super();
        this._blockchain = blockchain;
        this._addresses = addresses;
        this._channel = channel;

        // The peer object we create after the handshake completes.
        this._peer = null;

        // All peerAddresses that we think the remote peer knows.
        this._knownAddresses = new HashSet();

        // Helper object to keep track of timeouts & intervals.
        this._timers = new Timers();

        // True if we have received the peer's version message.
        this._versionReceived = false;

        // True if we have successfully sent our version message.
        this._versionSent = false;

        // Number of times we have tried to send out the version message.
        this._versionAttempts = 0;

        // Listen to network/control messages from the peer.
        channel.on('version',   msg => this._onVersion(msg));
        channel.on('verack',    msg => this._onVerAck(msg));
        channel.on('addr',      msg => this._onAddr(msg));
        channel.on('getaddr',   msg => this._onGetAddr(msg));
        channel.on('ping',      msg => this._onPing(msg));
        channel.on('pong',      msg => this._onPong(msg));

        // Clean up when the peer disconnects.
        channel.on('close', closedByRemote => this._onClose(closedByRemote));

        // Initiate the protocol with the new peer.
        this._handshake();
    }

    relayAddresses(addresses) {
        // Don't relay if the handshake hasn't finished yet.
        if (!this._versionReceived || !this._versionSent) {
            return;
        }

        // Only relay addresses that the peer doesn't know yet. If the address
        // the peer knows is older than RELAY_THROTTLE, relay the address again.
        const filteredAddresses = addresses.filter(addr => {
            const knownAddress = this._knownAddresses.get(addr);
            return addr.timestamp !== 0 // Never relay seed addresses.
                && (!knownAddress || knownAddress.timestamp < Date.now() - NetworkAgent.RELAY_THROTTLE);
        });

        if (filteredAddresses.length) {
            this._channel.addr(filteredAddresses);

            // We assume that the peer knows these addresses now.
            for (const address of filteredAddresses) {
                this._knownAddresses.add(address);
            }
        }
    }


    /* Handshake */

    async _handshake() {
        // Kick off the handshake by telling the peer our version, network address & blockchain height.
        // Firefox sends the data-channel-open event too early, so sending the version message might fail.
        // Try again in this case.
        if (!this._channel.version(NetworkConfig.myPeerAddress(), this._blockchain.height)) {
            this._versionAttempts++;
            if (this._versionAttempts >= NetworkAgent.VERSION_ATTEMPTS_MAX) {
                this._channel.close('sending of version message failed');
                return;
            }

            setTimeout(this._handshake.bind(this), NetworkAgent.VERSION_RETRY_DELAY);
            return;
        }

        this._versionSent = true;

        // Drop the peer if it doesn't send us a version message.
        // Only do this if we haven't received the peer's version message already.
        if (!this._versionReceived) {
            // TODO Should we ban instead?
            this._timers.setTimeout('version', () => {
                this._timers.clearTimeout('version');
                this._channel.close('version timeout');
            }, NetworkAgent.HANDSHAKE_TIMEOUT);
        } else {
            // The peer has sent us his version message already.
            this._finishHandshake();
        }
    }

    async _onVersion(msg) {
        // Make sure this is a valid message in our current state.
        if (!this._canAcceptMessage(msg)) {
            return;
        }

        // TODO actually check version, services and stuff.

        // Clear the version timeout.
        this._timers.clearTimeout('version');

        // Check that the given peerAddress matches the one we expect.
        // In case of inbound WebSocket connections, this is the first time we
        // see the remote peer's peerAddress.
        // TODO We should validate that the given peerAddress actually resolves
        // to the peer's netAddress!
        if (this._channel.peerAddress) {
            if (!this._channel.peerAddress.equals(msg.peerAddress)) {
                this._channel.close('unexpected peerAddress in version message');
                return;
            }
        }
        this._channel.peerAddress = msg.peerAddress;

        // Create peer object.
        this._peer = new Peer(
            this._channel,
            msg.version,
            msg.startHeight
        );

        // Remember that the peer has sent us this address.
        this._knownAddresses.add(msg.peerAddress);

        // Store/update the peerAddress.
        this._addresses.add(this._channel, msg.peerAddress);

        this._versionReceived = true;

        if (this._versionSent) {
            this._finishHandshake();
        }
    }

    _finishHandshake() {
        // Setup regular connectivity check.
        // TODO randomize interval?
        this._timers.setInterval('connectivity',
            () => this._checkConnectivity(),
            NetworkAgent.CONNECTIVITY_CHECK_INTERVAL);

        // Regularly announce our address.
        this._timers.setInterval('announce-addr',
            () => this._channel.addr([NetworkConfig.myPeerAddress()]),
            NetworkAgent.ANNOUNCE_ADDR_INTERVAL);

        // Tell listeners about the new peer that connected.
        this.fire('handshake', this._peer, this);

        // Request new network addresses from the peer.
        this._requestAddresses();
    }


    /* Addresses */

    _requestAddresses() {
        // Request addresses from peer.
        this._channel.getaddr(Services.myServiceMask());

        // XXX Do we need this timeout?
        this._timers.setTimeout('getaddr', () => {
            this._timers.clearTimeout('getaddr');
            Log.w(NetworkAgent, `Peer ${this._channel.peerAddress} did not send any addresses when asked`);
        }, NetworkAgent.GETADDR_TIMEOUT);
    }

    async _onAddr(msg) {
        // Make sure this is a valid message in our current state.
        if (!this._canAcceptMessage(msg)) {
            return;
        }

        // Reject messages that contain more than 1000 addresses, ban peer (bitcoin).
        if (msg.addresses.length > 1000) {
            Log.w(NetworkAgent, 'Rejecting addr message - too many addresses');
            this._channel.ban('addr message too large');
            return;
        }

        Log.d(NetworkAgent, `[ADDR] ${msg.addresses.length} addresses received from ${this._channel.peerAddress}`);

        // Clear the getaddr timeout.
        this._timers.clearTimeout('getaddr');

        // Remember that the peer has sent us these addresses.
        for (let addr of msg.addresses) {
            this._knownAddresses.add(addr);
        }

        // Put the new addresses in the address pool.
        await this._addresses.add(this._channel, msg.addresses);

        // Tell listeners that we have received new addresses.
        this.fire('addr', msg.addresses, this);
    }

    _onGetAddr(msg) {
        // Make sure this is a valid message in our current state.
        if (!this._canAcceptMessage(msg)) {
            return;
        }

        // Find addresses that match the given serviceMask.
        const addresses = this._addresses.findByServices(msg.serviceMask);

        const filteredAddresses = addresses.filter(addr => {
            // Exclude RTC addresses that are already at MAX_DISTANCE.
            // FIXME check if this works as intended.
            if (addr.protocol === Protocol.RTC && addr.distance >= PeerAddresses.MAX_DISTANCE) {
                return false;
            }

            // Exclude known addresses from the response unless they are older than RELAY_THROTTLE.
            const knownAddress = this._knownAddresses.get(addr);
            return !knownAddress || knownAddress.timestamp < Date.now() - NetworkAgent.RELAY_THROTTLE;
        });

        // Send the addresses back to the peer.
        if (filteredAddresses.length) {
            this._channel.addr(filteredAddresses);
        }
    }


    /* Connectivity Check */

    _checkConnectivity() {
        // Generate random nonce.
        const nonce = NumberUtils.randomUint32();

        // Send ping message to peer.
        // If sending the ping message fails, assume the connection has died.
        if (!this._channel.ping(nonce)) {
            this._channel.close('sending ping message failed').
            return;
        }

        // Drop peer if it doesn't answer with a matching pong message within the timeout.
        this._timers.setTimeout('ping_' + nonce, () => {
            this._timers.clearTimeout('ping_' + nonce);
            this._channel.close('ping timeout');
        }, NetworkAgent.PING_TIMEOUT);
    }

    _onPing(msg) {
        // Make sure this is a valid message in our current state.
        if (!this._canAcceptMessage(msg)) {
            return;
        }

        // Respond with a pong message
        this._channel.pong(msg.nonce);
    }

    _onPong(msg) {
        // Clear the ping timeout for this nonce.
        this._timers.clearTimeout('ping_' + msg.nonce);
    }

    _onClose(closedByRemote) {
        // Clear all timers and intervals when the peer disconnects.
        this._timers.clearAll();

        // Tell listeners that the peer has disconnected.
        this.fire('close', this._peer, this._channel, closedByRemote, this);
    }

    _canAcceptMessage(msg) {
        // The first message must be the version message.
        if (!this._versionReceived && msg.type !== Message.Type.VERSION) {
            Log.w(NetworkAgent, `Discarding ${msg.type} message from ${this._channel}`
                + ' - no version message received previously');
            return false;
        }
        return true;
    }

    get channel() {
        return this._channel;
    }

    get peer() {
        return this._peer;
    }
}
NetworkAgent.HANDSHAKE_TIMEOUT = 1000 * 3; // 3 seconds
NetworkAgent.PING_TIMEOUT = 1000 * 10; // 10 seconds
NetworkAgent.GETADDR_TIMEOUT = 1000 * 5; // 5 seconds
NetworkAgent.CONNECTIVITY_CHECK_INTERVAL = 1000 * 60; // 1 minute
NetworkAgent.ANNOUNCE_ADDR_INTERVAL = 1000 * 60 * 10; // 10 minutes
NetworkAgent.RELAY_THROTTLE = 1000 * 60 * 5; // 5 minutes
NetworkAgent.VERSION_ATTEMPTS_MAX = 10;
NetworkAgent.VERSION_RETRY_DELAY = 500; // 500 ms
Class.register(NetworkAgent);
