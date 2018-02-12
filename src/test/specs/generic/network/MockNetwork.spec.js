class MockPhy {
    /**
     * @constructor
     * @param {MockWebSocket} channel
     */
    constructor(channel) {
        this._channel = channel;
    }

    /**
     * @param {Uint8Array} msg
     * @returns {void}
     */
    send(msg) {
        if (Math.random() >= MockNetwork._lossrate) {
            setTimeout(() => this._channel.onmessage(msg), MockNetwork._delay);
        }
    }
}

class MockWebSocket extends Observable {
    /**
     * @constructor
     * @param {string} address
     */
    constructor(address) {
        super();
        /** @type {string} */
        this._localAddress = address;
        /** @type {DataChannel.ReadyState} */
        this._readyState = DataChannel.ReadyState.CONNECTING;
    }

    /** @type {WebSocket.ReadyState} */
    get readyState() {
        return this._readyState;
    }

    /** @type {string} */
    get localAddress() {
        return this._localAddress;
    }

    /**
     * @param {MockWebSocket} channel
     * @returns {void}
     */
    link(channel) {
        this._socket = { remoteAddress: channel.localAddress };
        this._phy = new MockPhy(channel);
        this.send = (msg) => this._phy.send(msg);
        this.close = () => channel.onclose();
        this._readyState = DataChannel.ReadyState.OPEN;
    }
}

class MockWebSocketServer extends Observable {
    /**
     * @constructor
     * @param {string} address
     */
    constructor(address) {
        super();
        /** @type {MockWebSocket} */
        this._mockWebSocket = new MockWebSocket(address);
    }

    /** @type {MockWebSocket} */
    get mockWebSocket() {
        return this._mockWebSocket;
    }
}

class MockNetwork {
    /**
     * @static
     * @param {?MockWebSocketServer} server
     * @param {MockWebSocket} client
     * @returns {void}
     */
    static link(server, client) {
        if (server) {
            server.mockWebSocket.link(client);
            client.link(server.mockWebSocket);

            setTimeout(() => {
                server.fire('connection', server.mockWebSocket);
                client.onopen();
            }, 0);
        } else {
            setTimeout(() => client.onerror(), 0);
        }
    }

    /**
     * @static
     * @param {number} delay delay (in miliseconds) for messages in the network
     * @param {number} lossrate percentage (from 0 to 1) of packets that are never delivered
     * @returns {void}
     */
    static install(delay = 0, lossrate = 0) {
        MockNetwork._delay = delay;
        MockNetwork._lossrate = lossrate;

        spyOn(WebSocketFactory, 'newWebSocketServer').and.callFake((netconfig) => {
            const peerAddress = netconfig.peerAddress;
            const server = new MockWebSocketServer(peerAddress.host);
            MockNetwork._servers.set(`wss://${peerAddress.host}:${peerAddress.port}`, server);
            return server;
        });

        spyOn(WebSocketFactory, 'newWebSocket').and.callFake((url) => {
            // XXX can this be done more elegantly?
            const address = url.split(/:\/*/)[1];

            const client = new MockWebSocket(address);
            const server = MockNetwork._servers.get(url);

            MockNetwork.link(server, client);
            return client;
        });
    }

    /**
     * @static
     * @returns {void}
     */
    static uninstall() {
        WebSocketFactory.newWebSocketServer.and.callThrough();
        WebSocketFactory.newWebSocket.and.callThrough();
    }
}
/**
 * @type {Map<string, MockWebSocketServer>}
 * @private
 */
MockNetwork._servers = new Map();
MockNetwork._delay = 0;
MockNetwork._lossrate = 0;
Class.register(MockNetwork);
