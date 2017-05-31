class PeerConnection extends Observable {
    constructor(nativeChannel, protocol, netAddress, peerAddress) {
        super();
        this._channel = nativeChannel;

        this._protocol = protocol;
        this._netAddress = netAddress;
        this._peerAddress = peerAddress;

        this._bytesReceived = 0;
        this._bytesSent = 0;

        this._inbound = peerAddress === null;
        this._closedByUs = false;
        this._closed = false;

        // Unique id for this connection.
        this._id = PeerConnection._instanceCount++;

        if (this._channel.on) {
            this._channel.on('message', msg => this._onMessage(msg.data || msg));
            this._channel.on('close', () => this._onClose());
            this._channel.on('error', e => this.fire('error', e, this));
        } else {
            this._channel.onmessage = msg => this._onMessage(msg.data || msg);
            this._channel.onclose = () => this._onClose();
            this._channel.onerror = e => this.fire('error', e, this);
        }
    }

    _onMessage(msg) {
        // Don't emit messages if this channel is closed.
        if (this._closed) {
            return;
        }

        // XXX Cleanup!
        if (!PlatformUtils.isBrowser() || !(msg instanceof Blob)) {
            this._bytesReceived += msg.byteLength || msg.length;
            this.fire('message', msg, this);
        } else {
            // Browser only
            // TODO FileReader is slow and this is ugly anyways. Improve!
            const reader = new FileReader();
            reader.onloadend = () => this._onMessage(new Uint8Array(reader.result));
            reader.readAsArrayBuffer(msg);
        }
    }

    _onClose() {
        // Don't fire close event again when already closed.
        if (this._closed) {
            return;
        }

        // Mark this connection as closed.
        this._closed = true;

        // Tell listeners that this connection has closed.
        this.fire('close', !this._closedByUs, this);
    }

    _close() {
        this._closedByUs = true;

        // Don't wait for the native close event to fire.
        this._onClose();

        // Close the native channel.
        this._channel.close();
    }

    _isChannelOpen() {
        // XXX Should work, but it's not pretty.
        return this._channel.readyState === WebSocket.OPEN
            || this._channel.readyState === 'open';
    }

    send(msg) {
        if (this._channel.closed) {
            console.error('Tried to send data over closed connection ${this}');
            return false;
        }

        // Don't attempt to send if channel is opening/closing.
        if (!this._isChannelOpen()) {
            console.warn('Not sending data over ${this} - not open (${this._channel.readyState})');
            return false;
        }

        try {
            this._channel.send(msg);
            this._bytesSent += msg.byteLength || msg.length;
            return true;
        } catch (e) {
            console.error(`Failed to send data over ${this}: ${e.message || e}`);
            return false;
        }
    }

    close(reason) {
        const connType = this._inbound ? 'inbound' : 'outbound';
        console.log(`Closing ${connType} connection #${this._id} ${this._netAddress}` + (reason ? ` - ${reason}` : ''));
        this._close();
    }

    ban(reason) {
        console.warn(`Banning peer ${this._peerAddress} (${this._netAddress})` + (reason ? ` - ${reason}` : ''));
        this._close();
        this.fire('ban', reason, this);
    }

    equals(o) {
        return o instanceof PeerConnection
            && this._id === o.id;
    }

    hashCode() {
        return this._id;
    }

    toString() {
        return `PeerConnection{id=${this._id}, protocol=${this._protocol}, peerAddress=${this._peerAddress}, netAddress=${this._netAddress}}`;
    }

    get id() {
        return this._id;
    }

    get protocol() {
        return this._protocol;
    }

    get peerAddress() {
        return this._peerAddress;
    }

    // Set when the VERSION message is received on an inbound connection.
    set peerAddress(value) {
        this._peerAddress = value;
    }

    get netAddress() {
        return this._netAddress;
    }

    get bytesReceived() {
        return this._bytesReceived;
    }

    get bytesSent() {
        return this._bytesSent;
    }

    get inbound() {
        return this._inbound;
    }

    get closed() {
        return this._closed;
    }
}
// Used to generate unique PeerConnection ids.
PeerConnection._instanceCount = 0;
Class.register(PeerConnection);
