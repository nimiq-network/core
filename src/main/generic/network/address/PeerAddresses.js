// TODO Limit the number of addresses we store.
class PeerAddresses extends Observable {
    /**
     * @constructor
     * @param {NetworkConfig} netconfig
     */
    constructor(netconfig) {
        super();

        /**
         * Set of PeerAddressStates of all peerAddresses we know.
         * @type {HashSet.<PeerAddressState>}
         * @private
         */
        this._store = new HashSet();

        /**
         * Map from peerIds to RTC peerAddresses.
         * @type {HashMap.<PeerId,PeerAddressState>}
         * @private
         */
        this._peerIds = new HashMap();

        /**
         * @type {NetworkConfig}
         * @private
         */
        this._networkConfig = netconfig;

        // Init seed peers.
        this.add(/*channel*/ null, PeerAddresses.SEED_PEERS);

        // Setup housekeeping interval.
        setInterval(() => this._housekeeping(), PeerAddresses.HOUSEKEEPING_INTERVAL);
    }

    /**
     * @param {PeerAddress} peerAddress
     * @returns {?PeerAddressState}
     * @private
     */
    _get(peerAddress) {
        if (peerAddress instanceof WsPeerAddress) {
            const localPeerAddress = this._store.get(peerAddress.withoutId());
            if (localPeerAddress) return localPeerAddress;
        }
        return this._store.get(peerAddress);
    }

    /**
     * @param {PeerAddress} peerAddress
     * @returns {?PeerAddressState}
     */
    getState(peerAddress) {
        return this._get(peerAddress);
    }

    /**
     * @param {PeerAddress} peerAddress
     * @returns {PeerAddress|null}
     */
    get(peerAddress) {
        /** @type {PeerAddressState} */
        const peerAddressState = this._get(peerAddress);
        return peerAddressState ? peerAddressState.peerAddress : null;
    }

    /**
     * @param {PeerId} peerId
     * @returns {PeerAddress|null}
     */
    getByPeerId(peerId) {
        /** @type {PeerAddressState} */
        const peerAddressState = this._peerIds.get(peerId);
        return peerAddressState ? peerAddressState.peerAddress : null;
    }

    /**
     * @param {PeerId} peerId
     * @returns {PeerChannel}
     */
    getChannelByPeerId(peerId) {
        const peerAddressState = this._peerIds.get(peerId);
        if (peerAddressState && peerAddressState.bestRoute) {
            return peerAddressState.bestRoute.signalChannel;
        }
        return null;
    }

    /**
     * @todo improve this by returning the best addresses first.
     * @param {number} protocolMask
     * @param {number} serviceMask
     * @param {number} maxAddresses
     * @returns {Array.<PeerAddress>}
     */
    query(protocolMask, serviceMask, maxAddresses = 1000) {
        // XXX inefficient linear scan
        const now = Date.now();
        const addresses = [];
        for (const peerAddressState of this._store.values()) {
            // Never return banned or failed addresses.
            if (peerAddressState.state === PeerAddressState.BANNED
                    || peerAddressState.state === PeerAddressState.FAILED) {
                continue;
            }

            // Never return seed peers.
            const address = peerAddressState.peerAddress;
            if (address.isSeed()) {
                continue;
            }

            // Only return addresses matching the protocol mask.
            if ((address.protocol & protocolMask) === 0) {
                continue;
            }

            // Only return addresses matching the service mask.
            if ((address.services & serviceMask) === 0) {
                continue;
            }

            // Update timestamp for connected peers.
            if (peerAddressState.state === PeerAddressState.CONNECTED) {
                // Also update timestamp for RTC connections
                if (peerAddressState.bestRoute) {
                    peerAddressState.bestRoute.timestamp = now;
                }
            }

            // Never return addresses that are too old.
            if (this._exceedsAge(address)) {
                continue;
            }

            // Return this address.
            addresses.push(address);

            // Stop if we have collected maxAddresses.
            if (addresses.length >= maxAddresses) {
                break;
            }
        }
        return addresses;
    }

    /**
     * @param {PeerChannel} channel
     * @param {PeerAddress|Array.<PeerAddress>} arg
     */
    add(channel, arg) {
        const peerAddresses = Array.isArray(arg) ? arg : [arg];
        const newAddresses = [];

        for (const addr of peerAddresses) {
            if (this._add(channel, addr)) {
                newAddresses.push(addr);
            }
        }

        // Tell listeners that we learned new addresses.
        if (newAddresses.length) {
            this.fire('added', newAddresses, this);
        }
    }

    /**
     * @param {PeerChannel} channel
     * @param {PeerAddress|RtcPeerAddress} peerAddress
     * @returns {boolean}
     * @private
     */
    _add(channel, peerAddress) {
        // Ignore our own address.
        if (this._networkConfig.peerAddress.equals(peerAddress)) {
            return false;
        }

        // Ignore address if it is too old.
        // Special case: allow seed addresses (timestamp == 0) via null channel.
        if (channel && this._exceedsAge(peerAddress)) {
            Log.d(PeerAddresses, `Ignoring address ${peerAddress} - too old (${new Date(peerAddress.timestamp)})`);
            return false;
        }

        // Ignore address if its timestamp is too far in the future.
        if (peerAddress.timestamp > Date.now() + PeerAddresses.MAX_TIMESTAMP_DRIFT) {
            Log.d(PeerAddresses, `Ignoring addresses ${peerAddress} - timestamp in the future`);
            return false;
        }

        // Increment distance values of RTC addresses.
        if (peerAddress.protocol === Protocol.RTC) {
            peerAddress.distance++;

            // Ignore address if it exceeds max distance.
            if (peerAddress.distance > PeerAddresses.MAX_DISTANCE) {
                Log.d(PeerAddresses, `Ignoring address ${peerAddress} - max distance exceeded`);
                // Drop any route to this peer over the current channel. This may prevent loops.
                const peerAddressState = this._get(peerAddress);
                if (peerAddressState) {
                    peerAddressState.deleteRoute(channel);
                }
                return false;
            }
        }

        // Check if we already know this address.
        let peerAddressState = this._get(peerAddress);
        if (peerAddressState) {
            const knownAddress = peerAddressState.peerAddress;

            // Ignore address if it is banned.
            if (peerAddressState.state === PeerAddressState.BANNED) {
                return false;
            }

            // Never update seed peers.
            if (knownAddress.isSeed()) {
                return false;
            }

            // Never erase NetAddresses.
            if (knownAddress.netAddress && !peerAddress.netAddress) {
                peerAddress.netAddress = knownAddress.netAddress;
            }

            // Ignore address if it is a websocket address and we already know this address with a more recent timestamp.
            if (peerAddress.protocol === Protocol.WS && knownAddress.timestamp >= peerAddress.timestamp) {
                return false;
            }
        } else {
            // Add new peerAddressState.
            peerAddressState = new PeerAddressState(peerAddress);
            this._store.add(peerAddressState);
            if (peerAddress.protocol === Protocol.RTC) {
                // Index by peerId.
                this._peerIds.put(peerAddress.peerId, peerAddressState);
            }
        }

        // Add route.
        if (peerAddress.protocol === Protocol.RTC) {
            peerAddressState.addRoute(channel, peerAddress.distance, peerAddress.timestamp);
        }

        // Update the address.
        peerAddressState.peerAddress = peerAddress;

        return true;
    }

    /**
     * Called when a connection to this peerAddress has been established.
     * The connection might have been initiated by the other peer, so address
     * may not be known previously.
     * If it is already known, it has been updated by a previous version message.
     * @param {PeerChannel} channel
     * @param {PeerAddress|RtcPeerAddress} peerAddress
     * @returns {void}
     */
    connected(channel, peerAddress) {
        let peerAddressState = this._get(peerAddress);
        
        if (!peerAddressState) {
            peerAddressState = new PeerAddressState(peerAddress);

            if (peerAddress.protocol === Protocol.RTC) {
                this._peerIds.put(peerAddress.peerId, peerAddressState);
            }

            this._store.add(peerAddressState);
        }

        if (peerAddressState.state === PeerAddressState.BANNED
            // Allow recovering seed peer's inbound connection to succeed.
            && !peerAddressState.peerAddress.isSeed()) {

            throw 'Connected to banned address';
        }

        peerAddressState.state = PeerAddressState.CONNECTED;
        peerAddressState.lastConnected = Date.now();
        peerAddressState.failedAttempts = 0;
        peerAddressState.bannedUntil = -1;
        peerAddressState.banBackoff = PeerAddresses.INITIAL_FAILED_BACKOFF;

        if (!peerAddressState.peerAddress.isSeed()) {
            peerAddressState.peerAddress = peerAddress;
        }

        // Add route.
        if (peerAddress.protocol === Protocol.RTC) {
            peerAddressState.addRoute(channel, peerAddress.distance, peerAddress.timestamp);
        }
    }

    /**
     * Called when a connection to this peerAddress is closed.
     * @param {PeerChannel} channel
     * @param {PeerAddress} peerAddress
     * @param {boolean} closedByRemote
     * @returns {void}
     */
    disconnected(channel, peerAddress, closedByRemote) {
        const peerAddressState = this._get(peerAddress);
        if (!peerAddressState) {
            return;
        }

        // Delete all addresses that were signalable over the disconnected peer.
        if (channel) {
            this._removeBySignalChannel(channel);
        }

        if (peerAddressState.state === PeerAddressState.BANNED) {
            return;
        }

        // Always set state to tried, even when deciding to delete this address.
        // In the latter case, this will not influence the deletion,
        // but it will prevent decrementing the peer count twice when banning seed nodes.
        peerAddressState.state = PeerAddressState.TRIED;

        // XXX Immediately delete address if the remote host closed the connection.
        // Also immediately delete dumb clients, since we cannot connect to those anyway.
        if ((closedByRemote && PlatformUtils.isOnline()) || peerAddress.protocol === Protocol.DUMB) {
            this._remove(peerAddress);
        }
    }

    /**
     * Called when a network connection to this peerAddress has failed.
     * @param {PeerAddress} peerAddress
     * @returns {void}
     */
    failure(peerAddress) {
        const peerAddressState = this._get(peerAddress);
        if (!peerAddressState) {
            return;
        }
        if (peerAddressState.state === PeerAddressState.BANNED) {
            return;
        }

        peerAddressState.state = PeerAddressState.FAILED;
        peerAddressState.failedAttempts++;

        if (peerAddressState.failedAttempts >= peerAddressState.maxFailedAttempts) {
            // Remove address only if we have tried the maximum number of backoffs.
            if (peerAddressState.banBackoff >= PeerAddresses.MAX_FAILED_BACKOFF) {
                this._remove(peerAddress);
            } else {
                peerAddressState.bannedUntil = Date.now() + peerAddressState.banBackoff;
                peerAddressState.banBackoff = Math.min(PeerAddresses.MAX_FAILED_BACKOFF, peerAddressState.banBackoff * 2);
            }
        }
    }

    /**
     * Called when a message has been returned as unroutable.
     * @param {PeerChannel} channel
     * @param {PeerAddress} peerAddress
     * @returns {void}
     */
    unroutable(channel, peerAddress) {
        if (!peerAddress) {
            return;
        }

        const peerAddressState = this._get(peerAddress);
        if (!peerAddressState) {
            return;
        }

        if (!peerAddressState.bestRoute || !peerAddressState.bestRoute.signalChannel.equals(channel)) {
            Log.w(PeerAddresses, `Got unroutable for ${peerAddress} on a channel other than the best route.`);
            return;
        }

        peerAddressState.deleteBestRoute();
        if (!peerAddressState.hasRoute()) {
            this._remove(peerAddressState.peerAddress);
        }
    }

    /**
     * @param {PeerAddress} peerAddress
     * @param {number} [duration] in milliseconds
     * @returns {void}
     */
    ban(peerAddress, duration = PeerAddresses.DEFAULT_BAN_TIME) {
        let peerAddressState = this._get(peerAddress);
        if (!peerAddressState) {
            peerAddressState = new PeerAddressState(peerAddress);
            this._store.add(peerAddressState);
        }

        peerAddressState.state = PeerAddressState.BANNED;
        peerAddressState.bannedUntil = Date.now() + duration;

        // Drop all routes to this peer.
        peerAddressState.deleteAllRoutes();
    }

    /**
     * @param {PeerAddress} peerAddress
     * @returns {boolean}
     */
    isBanned(peerAddress) {
        const peerAddressState = this._get(peerAddress);
        return peerAddressState
            && peerAddressState.state === PeerAddressState.BANNED
            // XXX Never consider seed peers to be banned. This allows us to use
            // the banning mechanism to prevent seed peers from being picked when
            // they are down, but still allows recovering seed peers' inbound
            // connections to succeed.
            && !peerAddressState.peerAddress.isSeed();
    }

    /**
     * @param {PeerAddress} peerAddress
     * @returns {void}
     * @private
     */
    _remove(peerAddress) {
        const peerAddressState = this._get(peerAddress);
        if (!peerAddressState) {
            return;
        }

        // Never delete seed addresses, ban them instead for a couple of minutes.
        if (peerAddressState.peerAddress.isSeed()) {
            this.ban(peerAddress, peerAddressState.banBackoff);
            return;
        }

        // Delete from peerId index.
        if (peerAddress.protocol === Protocol.RTC) {
            this._peerIds.remove(peerAddress.peerId);
        }

        // Don't delete bans.
        if (peerAddressState.state === PeerAddressState.BANNED) {
            return;
        }

        // Delete the address.
        this._store.remove(peerAddress);
    }

    /**
     * Delete all RTC-only routes that are signalable over the given peer.
     * @param {PeerChannel} channel
     * @returns {void}
     * @private
     */
    _removeBySignalChannel(channel) {
        // XXX inefficient linear scan
        for (const peerAddressState of this._store.values()) {
            if (peerAddressState.peerAddress.protocol === Protocol.RTC) {
                peerAddressState.deleteRoute(channel);
                if (!peerAddressState.hasRoute()) {
                    this._remove(peerAddressState.peerAddress);
                }
            }
        }
    }

    /**
     * @returns {void}
     * @private
     */
    _housekeeping() {
        const now = Date.now();
        const unbannedAddresses = [];

        for (/** @type {PeerAddressState} */ const peerAddressState of this._store.values()) {
            const addr = peerAddressState.peerAddress;

            switch (peerAddressState.state) {
                case PeerAddressState.NEW:
                case PeerAddressState.TRIED:
                case PeerAddressState.FAILED:
                    // Delete all new peer addresses that are older than MAX_AGE.
                    if (this._exceedsAge(addr)) {
                        Log.d(PeerAddresses, `Deleting old peer address ${addr}`);
                        this._remove(addr);
                    }

                    // Reset failed attempts after bannedUntil has expired.
                    if (peerAddressState.state === PeerAddressState.FAILED
                        && peerAddressState.failedAttempts >= peerAddressState.maxFailedAttempts
                        && peerAddressState.bannedUntil > 0 && peerAddressState.bannedUntil <= now) {

                        peerAddressState.bannedUntil = -1;
                        peerAddressState.failedAttempts = 0;
                    }

                    break;

                case PeerAddressState.BANNED:
                    if (peerAddressState.bannedUntil <= now) {
                        // Don't remove seed addresses, unban them.
                        if (addr.isSeed()) {
                            // Restore banned seed addresses to the NEW state.
                            peerAddressState.state = PeerAddressState.NEW;
                            peerAddressState.failedAttempts = 0;
                            peerAddressState.bannedUntil = -1;
                            unbannedAddresses.push(addr);
                        } else {
                            // Delete expires bans.
                            this._store.remove(addr);
                        }
                    }
                    break;

                case PeerAddressState.CONNECTED:
                    // Also update timestamp for RTC connections
                    if (peerAddressState.bestRoute) {
                        peerAddressState.bestRoute.timestamp = now;
                    }
                    break;

                default:
                    // TODO What about peers who are stuck connecting? Can this happen?
                    // Do nothing for CONNECTING peers.
            }
        }

        if (unbannedAddresses.length) {
            this.fire('added', unbannedAddresses, this);
        }
    }

    /**
     * @param {PeerAddress} peerAddress
     * @returns {boolean}
     * @private
     */
    _exceedsAge(peerAddress) {
        // Seed addresses are never too old.
        if (peerAddress.isSeed()) {
            return false;
        }

        const age = Date.now() - peerAddress.timestamp;
        switch (peerAddress.protocol) {
            case Protocol.WS:
                return age > PeerAddresses.MAX_AGE_WEBSOCKET;

            case Protocol.RTC:
                return age > PeerAddresses.MAX_AGE_WEBRTC;

            case Protocol.DUMB:
                return age > PeerAddresses.MAX_AGE_DUMB;
        }
        return false;
    }
}
PeerAddresses.MAX_AGE_WEBSOCKET = 1000 * 60 * 30; // 30 minutes
PeerAddresses.MAX_AGE_WEBRTC = 1000 * 60 * 10; // 10 minutes
PeerAddresses.MAX_AGE_DUMB = 1000 * 60; // 1 minute
PeerAddresses.MAX_DISTANCE = 4;
PeerAddresses.MAX_FAILED_ATTEMPTS_WS = 3;
PeerAddresses.MAX_FAILED_ATTEMPTS_RTC = 2;
PeerAddresses.MAX_TIMESTAMP_DRIFT = 1000 * 60 * 10; // 10 minutes
PeerAddresses.HOUSEKEEPING_INTERVAL = 1000 * 60; // 1 minute
PeerAddresses.DEFAULT_BAN_TIME = 1000 * 60 * 10; // 10 minutes
PeerAddresses.INITIAL_FAILED_BACKOFF = 1000 * 15; // 15 seconds
PeerAddresses.MAX_FAILED_BACKOFF = 1000 * 60 * 10; // 10 minutes
PeerAddresses.SEED_PEERS = [
    // WsPeerAddress.seed('alpacash.com', 8080),
    // WsPeerAddress.seed('nimiq1.styp-rekowsky.de', 8080),
    // WsPeerAddress.seed('nimiq2.styp-rekowsky.de', 8080),
    // WsPeerAddress.seed('seed1.nimiq-network.com', 8080),
    // WsPeerAddress.seed('seed2.nimiq-network.com', 8080),
    // WsPeerAddress.seed('seed3.nimiq-network.com', 8080),
    // WsPeerAddress.seed('seed4.nimiq-network.com', 8080),
    // WsPeerAddress.seed('emily.nimiq-network.com', 443)
    WsPeerAddress.seed('dev.nimiq-network.com', 8080, 'e65e39616662f2c16d62dc08915e5a1d104619db8c2b9cf9b389f96c8dce9837')
];
Class.register(PeerAddresses);

class PeerAddressState {
    /**
     * @param {PeerAddress} peerAddress
     */
    constructor(peerAddress) {
        /** @type {PeerAddress} */
        this.peerAddress = peerAddress;

        /** @type {number} */
        this.state = PeerAddressState.NEW;
        /** @type {number} */
        this.lastConnected = -1;
        /** @type {number} */
        this.bannedUntil = -1;
        /** @type {number} */
        this.banBackoff = PeerAddresses.INITIAL_FAILED_BACKOFF;

        /** @type {SignalRoute} */
        this._bestRoute = null;
        /** @type {HashSet.<SignalRoute>} */
        this._routes = new HashSet();

        /** @type {number} */
        this._failedAttempts = 0;
    }

    /** @type {number} */
    get maxFailedAttempts() {
        switch (this.peerAddress.protocol) {
            case Protocol.RTC:
                return PeerAddresses.MAX_FAILED_ATTEMPTS_RTC;
            case Protocol.WS:
                return PeerAddresses.MAX_FAILED_ATTEMPTS_WS;
            default:
                return 0;
        }
    }

    /** @type {number} */
    get failedAttempts() {
        if (this._bestRoute) {
            return this._bestRoute.failedAttempts;
        } else {
            return this._failedAttempts;
        }
    }

    /** @type {number} */
    set failedAttempts(value) {
        if (this._bestRoute) {
            this._bestRoute.failedAttempts = value;
            this._updateBestRoute(); // scores may have changed
        } else {
            this._failedAttempts = value;
        }
    }

    /** @type {SignalRoute} */
    get bestRoute() {
        return this._bestRoute;
    }

    /**
     * @param {PeerChannel} signalChannel
     * @param {number} distance
     * @param {number} timestamp
     * @returns {void}
     */
    addRoute(signalChannel, distance, timestamp) {
        const oldRoute = this._routes.get(signalChannel);
        const newRoute = new SignalRoute(signalChannel, distance, timestamp);

        if (oldRoute) {
            // Do not reset failed attempts.
            newRoute.failedAttempts = oldRoute.failedAttempts;
        }
        this._routes.add(newRoute);

        if (!this._bestRoute || newRoute.score > this._bestRoute.score
            || (newRoute.score === this._bestRoute.score && timestamp > this._bestRoute.timestamp)) {

            this._bestRoute = newRoute;
            this.peerAddress.distance = this._bestRoute.distance;
        }
    }

    /**
     * @returns {void}
     */
    deleteBestRoute() {
        if (this._bestRoute) {
            this.deleteRoute(this._bestRoute.signalChannel);
        }
    }

    /**
     * @param {PeerChannel} signalChannel
     * @returns {void}
     */
    deleteRoute(signalChannel) {
        this._routes.remove(signalChannel); // maps to same hashCode
        if (this._bestRoute && this._bestRoute.signalChannel.equals(signalChannel)) {
            this._updateBestRoute();
        }
    }

    /**
     * @returns {void}
     */
    deleteAllRoutes() {
        this._bestRoute = null;
        this._routes = new HashSet();
    }

    /**
     * @returns {boolean}
     */
    hasRoute() {
        return this._routes.length > 0;
    }

    /**
     * @returns {void}
     * @private
     */
    _updateBestRoute() {
        let bestRoute = null;
        // Choose the route with minimal distance and maximal timestamp.
        for (const route of this._routes.values()) {
            if (bestRoute === null || route.score > bestRoute.score
                || (route.score === bestRoute.score && route.timestamp > bestRoute.timestamp)) {

                bestRoute = route;
            }
        }
        this._bestRoute = bestRoute;
        if (this._bestRoute) {
            this.peerAddress.distance = this._bestRoute.distance;
        } else {
            this.peerAddress.distance = PeerAddresses.MAX_DISTANCE + 1;
        }
    }

    /**
     * @param {PeerAddressState|*} o
     * @returns {boolean}
     */
    equals(o) {
        return o instanceof PeerAddressState
            && this.peerAddress.equals(o.peerAddress);
    }

    /**
     * @returns {string}
     */
    hashCode() {
        return this.peerAddress.hashCode();
    }

    /**
     * @returns {string}
     */
    toString() {
        return `PeerAddressState{peerAddress=${this.peerAddress}, state=${this.state}, `
            + `lastConnected=${this.lastConnected}, failedAttempts=${this.failedAttempts}, `
            + `bannedUntil=${this.bannedUntil}}`;
    }
}
PeerAddressState.NEW = 1;
PeerAddressState.CONNECTED = 3;
PeerAddressState.TRIED = 4;
PeerAddressState.FAILED = 5;
PeerAddressState.BANNED = 6;
Class.register(PeerAddressState);

class SignalRoute {
    /**
     * @param {PeerChannel} signalChannel
     * @param {number} distance
     * @param {number} timestamp
     */
    constructor(signalChannel, distance, timestamp) {
        this.failedAttempts = 0;
        this.timestamp = timestamp;
        this._signalChannel = signalChannel;
        this._distance = distance;
    }

    /** @type {PeerChannel} */
    get signalChannel() {
        return this._signalChannel;
    }

    /** @type {number} */
    get distance() {
        return this._distance;
    }

    /** @type {number} */
    get score() {
        return ((PeerAddresses.MAX_DISTANCE - this._distance) / 2) * (1 - (this.failedAttempts / PeerAddresses.MAX_FAILED_ATTEMPTS_RTC));
    }

    /**
     * @param {SignalRoute} o
     * @returns {boolean}
     */
    equals(o) {
        return o instanceof SignalRoute
            && this._signalChannel.equals(o._signalChannel);
    }

    /**
     * @returns {string}
     */
    hashCode() {
        return this._signalChannel.hashCode();
    }

    /**
     * @returns {string}
     */
    toString() {
        return `SignalRoute{signalChannel=${this._signalChannel}, distance=${this._distance}, timestamp=${this.timestamp}, failedAttempts=${this.failedAttempts}}`;
    }
}
Class.register(SignalRoute);
