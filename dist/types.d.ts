export function load(path?: string): Promise<void>;

export let _path: string | undefined;

export class Class {
    public static scope: any;
    public static register(cls: any): void;
}

/* Client API */

declare type Handle = number;
declare type BlockListener = (blockHash: Hash) => Promise<any> | any;
declare type ConsensusChangedListener = (consensusState: Client.ConsensusState) => Promise<any> | any;
declare type HeadChangedListener = (blockHash: Hash, reason: string, revertedBlocks: Hash[], adoptedBlocks: Hash[]) => Promise<any> | any;
declare type TransactionListener = (transaction: Client.TransactionDetails) => Promise<any> | any;
declare type MempoolListener = (transactionHash: Hash) => Promise<any> | any;

export class Client {
    public static Configuration: typeof ClientConfiguration;
    public static ConfigurationBuilder: typeof ClientConfigurationBuilder;
    public static Mempool: typeof ClientMempool;
    public static MempoolStatistics: typeof ClientMempoolStatistics;
    public static Network: typeof ClientNetwork;
    public static BasicAddress: typeof ClientBasicAddress;
    public static AddressInfo: typeof ClientAddressInfo;
    public static PeerInfo: typeof ClientPeerInfo;
    public static NetworkStatistics: typeof ClientNetworkStatistics;
    public static TransactionDetails: typeof ClientTransactionDetails;
    public static TransactionState: {
        NEW: 'new';
        PENDING: 'pending';
        MINED: 'mined';
        INVALIDATED: 'invalidated';
        EXPIRED: 'expired';
        CONFIRMED: 'confirmed';
    };
    public static Feature: {
        MINING: 'MINING';
        LOCAL_HISTORY: 'LOCAL_HISTORY';
        MEMPOOL: 'MEMPOOL';
        PASSIVE: 'PASSIVE';
    };
    public static ConsensusState: {
        CONNECTING: 'connecting';
        SYNCING: 'syncing';
        ESTABLISHED: 'established';
    };
    public network: Client.Network;
    public mempool: Client.Mempool;
    public _consensusState: Client.ConsensusState;
    constructor(config: Client.Configuration | object, consensus?: Promise<BaseConsensus>);
    public getHeadHash(): Promise<Hash>;
    public getHeadHeight(): Promise<number>;
    public getHeadBlock(includeBody?: boolean): Promise<Block>;
    public getBlock(hash: Hash | string, includeBody?: boolean): Promise<Block>;
    public getBlockAt(height: number, includeBody?: boolean): Promise<Block>;
    public getBlockTemplate(minerAddress: Address | string, extraData?: Uint8Array | string): Promise<Block>;
    public submitBlock(block: Block): Promise<boolean>;
    public getAccount(address: Address | string): Promise<Account>;
    public getAccounts(addresses: Array<Address | string>): Promise<Account[]>;
    public getTransaction(hash: Hash | string, blockHash?: Hash | string, blockHeight?: number): Promise<Client.TransactionDetails>;
    public getTransactionReceipt(hash: Hash | string): Promise<TransactionReceipt | undefined>;
    public getTransactionReceiptsByAddress(address: Address | string, limit?: number): Promise<TransactionReceipt[]>;
    public getTransactionReceiptsByHashes(hashes: Array<Hash | string>): Promise<TransactionReceipt[]>;
    public getTransactionsByAddress(address: Address | string, sinceBlockHeight?: number, knownTransactionDetails?: Client.TransactionDetails[] | Array<ReturnType<Client.TransactionDetails['toPlain']>>, limit?: number): Promise<Client.TransactionDetails[]>;
    public sendTransaction(tx: Transaction | object | string): Promise<Client.TransactionDetails>;
    public addBlockListener(listener: BlockListener): Promise<Handle>;
    public addConsensusChangedListener(listener: ConsensusChangedListener): Promise<Handle>;
    public addHeadChangedListener(listner: HeadChangedListener): Promise<Handle>;
    public addTransactionListener(listener: TransactionListener, addresses: Array<Address | string>): Promise<Handle>;
    public removeListener(handle: Handle): Promise<void>;
    public waitForConsensusEstablished(): Promise<void>;
}

export namespace Client {
    type ConsensusState = ConsensusState.CONNECTING | ConsensusState.SYNCING | ConsensusState.ESTABLISHED;
    namespace ConsensusState {
        type CONNECTING = 'connecting';
        type SYNCING = 'syncing';
        type ESTABLISHED = 'established';
    }
    type Configuration = ClientConfiguration;
    type ConfigurationBuilder = ClientConfigurationBuilder;
    type Feature = Feature.MINING | Feature.LOCAL_HISTORY | Feature.MEMPOOL | Feature.PASSIVE;
    namespace Feature {
        type MINING = 'MINING';
        type LOCAL_HISTORY = 'LOCAL_HISTORY';
        type MEMPOOL = 'MEMPOOL';
        type PASSIVE = 'PASSIVE';
    }
    type Mempool = ClientMempool;
    type MempoolStatistics = ClientMempoolStatistics;
    type Network = ClientNetwork;
    type BasicAddress = ClientBasicAddress;
    type AddressInfo = ClientAddressInfo;
    type PeerInfo = ClientPeerInfo;
    type NetworkStatistics = ClientNetworkStatistics;
    type TransactionDetails = ClientTransactionDetails;
    type TransactionState = TransactionState.NEW | TransactionState.PENDING | TransactionState.MINED | TransactionState.INVALIDATED | TransactionState.EXPIRED | TransactionState.CONFIRMED;
    namespace TransactionState {
        type NEW = 'new';
        type PENDING = 'pending';
        type MINED = 'mined';
        type INVALIDATED = 'invalidated';
        type EXPIRED = 'expired';
        type CONFIRMED = 'confirmed';
    }
}

declare class ClientConfiguration {
    public static builder(): Client.ConfigurationBuilder;
    public features: Client.Feature[];
    public requiredBlockConfirmations: number;
    public networkConfig: NetworkConfig;
    constructor(networkConfig: NetworkConfig, features?: Client.Feature[], useVolatileStorage?: boolean, requiredBlockConfirmations?: number);
    public createConsensus(): Promise<BaseConsensus>;
    public hasFeature(feature: Client.Feature): boolean;
    public requireFeatures(...features: Client.Feature[]): void;
    public instantiateClient(): Client;
}

declare class ClientConfigurationBuilder {
    constructor();
    public dumb(): this;
    public rtc(): this;
    public ws(host: string, port?: number): this;
    public wss(host: string, port: number, tlsKey: string, tlsCert: string): this;
    public protocol(protocol: 'dumb' | 'rtc' | 'ws' | 'wss', host: string, port: number, tlsKey: string, tlsCert: string): this;
    public volatile(volatile?: boolean): this;
    public blockConfirmations(confirmations: number): this;
    public feature(...feature: Client.Feature[]): this;
    public reverseProxy(port: number, header: string, ...addresses: string[]): this;
    public build(): Client.Configuration;
    public instantiateClient(): Client;
}

declare class ClientNetwork {
    constructor(client: Client);
    public getPeers(): Promise<Client.PeerInfo[]>;
    public getPeer(address: PeerAddress | Client.AddressInfo | string): Promise<Client.PeerInfo | null>;
    public getAddresses(): Promise<Client.AddressInfo[]>;
    public getAddress(address: PeerAddress | Client.AddressInfo | string): Promise<Client.AddressInfo | null>;
    public getOwnAddress(): Promise<Client.BasicAddress>;
    public getStatistics(): Promise<Client.NetworkStatistics>;
    public connect(address: PeerAddress | Client.BasicAddress | string): Promise<void>;
    public disconnect(address: PeerAddress | Client.BasicAddress | string): Promise<void>;
    public ban(address: PeerAddress | Client.BasicAddress | string): Promise<void>;
    public unban(address: PeerAddress | Client.BasicAddress | string): Promise<void>;
}

declare class ClientBasicAddress {
    public peerAddress: PeerAddress;
    public peerId: PeerId;
    public services: string[];
    public netAddress: NetAddress | null;
    constructor(address: PeerAddress);
    public toPlain(): {
        peerAddress: string,
        peerId: string,
        services: string[],
        netAddress: {
            ip: Uint8Array,
            reliable: boolean,
        } | null,
    };
}

declare class ClientAddressInfo extends ClientBasicAddress {
    public banned: boolean;
    public connected: boolean;
    public state: number;
    constructor(addressState: PeerAddressState);
    public toPlain(): {
        peerAddress: string,
        peerId: string,
        services: string[],
        netAddress: {
            ip: Uint8Array,
            reliable: boolean,
        } | null,
        banned: boolean,
        connected: boolean,
    };
}

declare class ClientPeerInfo extends ClientBasicAddress {
    public connectionSince: number;
    public bytesReceived: number;
    public bytesSent: number;
    public latency: number;
    public version: number;
    public state: number;
    public timeOffset: number;
    public headHash: Hash;
    public userAgent: string;
    constructor(connection: PeerConnection);
    public toPlain(): {
        peerAddress: string,
        peerId: string,
        services: string[],
        netAddress: {
            ip: Uint8Array,
            reliable: boolean,
        } | null,
        connectionSince: number,
        bytesReceived: number,
        bytesSent: number,
        latency: number,
        version: number,
        state: number,
        timeOffset: number,
        headHash: string,
        userAgent: string,
    };
}

declare class ClientNetworkStatistics {
    public bytesReceived: number;
    public bytesSent: number;
    public totalPeerCount: number;
    public peerCountsByType: {
        total: number,
        connecting: number,
        dumb: number,
        rtc: number,
        ws: number,
        wss: number,
    };
    public totalKnownAddresses: number;
    public knownAddressesByType: {
        total: number,
        rtc: number,
        ws: number,
        wss: number,
    };
    public timeOffset: number;
    constructor(network: Network);
    public toPlain(): {
        bytesReceived: number,
        bytesSent: number,
        totalPeerCount: number,
        peerCountsByType: {
            total: number,
            connecting: number,
            dumb: number,
            rtc: number,
            ws: number,
            wss: number,
        },
        totalKnownAddresses: number,
        knownAddressesByType: {
            total: number,
            rtc: number,
            ws: number,
            wss: number,
        },
        timeOffset: number,
    };
}

declare class ClientMempool {
    constructor(client: Client);
    public getTransactions(): Promise<Hash[]>;
    public getStatistics(): Promise<Client.MempoolStatistics>;
    public addTransactionAddedListener(listener: MempoolListener): Promise<Handle>;
    public addTransactionRemovedListener(listener: MempoolListener): Promise<Handle>;
    public removeListener(handle: Handle): void;
}

declare class ClientMempoolStatistics {
    public count: number;
    public size: number;
    public requiredFeePerByte: number;
    public countInBuckets: {buckets: []} | any;
    public sizeInBuckets: {buckets: []} | any;
    constructor(mempoolContents: Transaction[]);
}

declare class ClientTransactionDetails {
    public static fromPlain(o: object): Client.TransactionDetails;
    public transactionHash: Hash;
    public format: Transaction.Format;
    public sender: Address;
    public senderType: Account.Type;
    public recipient: Address;
    public recipientType: Account.Type;
    public value: number;
    public fee: number;
    public feePerByte: number;
    public validityStartHeight: number;
    public network: number;
    public flags: number;
    public data: {raw: Uint8Array};
    public proof: {raw: Uint8Array};
    public size: number;
    public valid: boolean;
    public transaction: Transaction;
    public state: Client.TransactionState;
    public blockHash: Hash;
    public blockHeight: number;
    public confirmations: number;
    public timestamp: number;
    constructor(
        transaction: Transaction,
        state: Client.TransactionState,
        blockHash?: Hash,
        blockHeight?: number,
        confirmations?: number,
        timestamp?: number,
    );
    public toPlain(): {
        transactionHash: string,
        format: string;
        sender: string;
        senderType: string;
        recipient: string;
        recipientType: string;
        value: number;
        fee: number;
        feePerByte: number;
        validityStartHeight: number;
        network: string;
        flags: number;
        data: {raw: string};
        proof: {
            raw: string,
            signature?: string,
            publicKey?: string,
            signer?: string,
            pathLength?: number,
        };
        size: number;
        valid: boolean;
        state: Client.TransactionState;
        blockHash?: string;
        blockHeight?: number;
        confirmations?: number;
        timestamp?: number;
    };
}

export class LogNative {
    constructor()
    public isLoggable(tag: string, level: number): boolean;
    public setLoggable(tag: string, level: number): void;
    public msg(level: number, tag: string | { name: string }, args: any[]): void;
}

export class Log {
    public static instance: Log;
    public static TRACE: Log.Level.TRACE;
    public static VERBOSE: Log.Level.VERBOSE;
    public static DEBUG: Log.Level.DEBUG;
    public static INFO: Log.Level.INFO;
    public static WARNING: Log.Level.WARNING;
    public static ERROR: Log.Level.ERROR;
    public static ASSERT: Log.Level.ASSERT;
    public static Level: {
        TRACE: 1;
        VERBOSE: 2;
        DEBUG: 3;
        INFO: 4;
        WARNING: 5;
        ERROR: 6;
        ASSERT: 7;
        toStringTag(level: Log.Level): string;
        toString(level: Log.Level): string;
        get(v: string | number | Log.Level): Log.Level;
    };
    public level: Log.Level;
    constructor(native: LogNative);
    public setLoggable(tag: string, level: Log.Level): void;
    public msg(level: Log.Level, tag: string | { name: string }, args: any[]): void;
    public d(tag: string | { name: string }, message: string | (() => string), args: any[]): void;
    public e(tag: string | { name: string }, message: string | (() => string), args: any[]): void;
    public i(tag: string | { name: string }, message: string | (() => string), args: any[]): void;
    public v(tag: string | { name: string }, message: string | (() => string), args: any[]): void;
    public w(tag: string | { name: string }, message: string | (() => string), args: any[]): void;
    public t(tag: string | { name: string }, message: string | (() => string), args: any[]): void;
}

export namespace Log {
    type Level = Level.TRACE | Level.VERBOSE | Level.DEBUG | Level.INFO | Level.WARNING | Level.ERROR | Level.ASSERT;
    namespace Level {
        type TRACE = 1;
        type VERBOSE = 2;
        type DEBUG = 3;
        type INFO = 4;
        type WARNING = 5;
        type ERROR = 6;
        type ASSERT = 7;
    }
}

export class Observable {
    public on(type: string, callback: (...args: any[]) => any): number;
    public off(type: string, id: number): void;
    public fire(type: string, ...args: any[]): (Promise<any> | null);
}

export abstract class DataChannel extends Observable {
    public static CHUNK_SIZE_MAX: 16384; // 16 kb
    public static MESSAGE_SIZE_MAX: 10485760; // 10 mb
    public static CHUNK_TIMEOUT: 5000; // 5 seconds
    public static MESSAGE_TIMEOUT: 3200000;
    public static ReadyState: {
        CONNECTING: 0;
        OPEN: 1;
        CLOSING: 2;
        CLOSED: 3;
        fromString(str: string): DataChannel.ReadyState;
    };
    public abstract readyState: DataChannel.ReadyState;
    public lastMessageReceivedAt: number;
    constructor();
    public isExpectingMessage(type: Message.Type): boolean;
    public confirmExpectedMessage(type: Message.Type, success: boolean): void;
    public expectMessage(types: Message.Type | Message.Type[], timeoutCallback: () => any, msgTimeout?: number, chunkTimeout?: number): void;
    public close(): void;
    public send(msg: Uint8Array): void;
    public abstract sendChunk(msg: Uint8Array): void;
}

export namespace DataChannel {
    type ReadyState = ReadyState.CONNECTING | ReadyState.OPEN | ReadyState.CLOSING | ReadyState.CLOSED;
    namespace ReadyState {
        type CONNECTING = 0;
        type OPEN = 1;
        type CLOSING = 2;
        type CLOSED = 3;
    }
}

export class ExpectedMessage {
    constructor(
        types: Message.Type[],
        timeoutCallback: () => any,
        msgTimeout: number,
        chunkTimeout: number,
    );
}

export class CryptoLib {
    public static instance: { getRandomValues(buf: Uint8Array): Uint8Array };
}

export class WebRtcFactory {
    public static newPeerConnection(configuration?: RTCConfiguration): RTCPeerConnection;
    public static newSessionDescription(rtcSessionDescriptionInit: any): RTCSessionDescription;
    public static newIceCandidate(rtcIceCandidateInit: any): RTCIceCandidate;
}

export class WebSocketFactory {
    public static newWebSocketServer(networkConfig: WsNetworkConfig | WssNetworkConfig): any;
    public static newWebSocket(url: string, [options]: any): WebSocket;
}

export class WebSocketServer {
    public static UPGRADE_TIMEOUT: 3000; // 3 seconds
    public static TLS_HANDSHAKE_TIMEOUT: 3000; // 3 seconds
    public static PAYLOAD_MAX: number;
    public static PENDING_UPGRADES_MAX: 1000;
    public static PENDING_UPGRADES_PER_IP_MAX: 2;
    public static PENDING_UPGRADES_PER_SUBNET_MAX: 6;
    public static CONNECTION_RATE_LIMIT_PER_IP: 10; // per minute
    public static CONNECTION_RATE_LIMIT_PER_SUBNET: 30; // per minute
    public static LIMIT_TRACKING_AGE_MAX: 120000; // 2 minutes
    public static HOUSEKEEPING_INTERVAL: 300000; // 5 minutes
    constructor(
        networkConfig: WsNetworkConfig | WssNetworkConfig,
    );
}

export class ConstantHelper {
    public static instance: ConstantHelper;
    constructor();
    public isConstant(constant: string): boolean;
    public get(constant: string): number;
    public set(constant: string, value: number): void;
    public reset(constant: string): void;
    public resetAll(): void;
}

export class Services {
    public static NONE: 0;
    public static FLAG_NANO: 1;
    public static FLAG_LIGHT: 2;
    public static FLAG_FULL: 4;
    public static ALL_LEGACY: 7;
    public static FULL_BLOCKS: number;
    public static BLOCK_HISTORY: number;
    public static BLOCK_PROOF: number;
    public static CHAIN_PROOF: number;
    public static ACCOUNTS_PROOF: number;
    public static ACCOUNTS_CHUNKS: number;
    public static MEMPOOL: number;
    public static TRANSACTION_INDEX: number;
    public static BODY_PROOF: number;
    public static ALL_CURRENT: number;
    public static NAMES: {[name: number]: string};
    public static PROVIDES_FULL: number;
    public static PROVIDES_LIGHT: number;
    public static PROVIDES_NANO: number;
    public static PROVIDES_PICO: number;
    public static ACCEPTS_FULL: number;
    public static ACCEPTS_LIGHT: number;
    public static ACCEPTS_NANO: number;
    public static ACCEPTS_PICO: number;
    public static ACCEPTS_SPV: number;
    public static isFullNode(services: number): boolean;
    public static isLightNode(services: number): boolean;
    public static isNanoNode(services: number): boolean;
    public static providesServices(flags: number, ...services: number[]): boolean;
    public static legacyProvideToCurrent(flags: number): number;
    public static toNameArray(flags: number): string[];
    public provided: number;
    public accepted: number;
    constructor(provided?: number, accepted?: number);
}

export class Timers {
    constructor();
    public setTimeout(key: any, fn: () => any, waitTime: number): void;
    public clearTimeout(key: any): void;
    public resetTimout(key: any, fn: () => any, waitTime: number): void;
    public timeoutExists(key: any): boolean;
    public setInterval(key: any, fn: () => any, intervalTime: number): void;
    public clearInterval(key: any): void;
    public resetInterval(key: any, fn: () => any, intervalTime: number): void;
    public intervalExists(key: any): boolean;
    public clearAll(): void;
}

export class Version {
    public static CODE: 2;
    public static CORE_JS_VERSION: string;
    public static isCompatible(code: number): boolean;
    public static createUserAgent(appAgent?: string): string;
}

export class Time {
    public offset: number;
    constructor(offset?: number);
    public now(): number;
}

export class EventLoopHelper {
    public static webYield(): Promise<void>;
    public static yield(): Promise<void>;
}

export class IteratorUtils {
    public static alternate<T>(...iterators: Array<Iterator<T>>): Iterable<T>;
}

export class ArrayUtils {
    public static randomElement(arr: any[]): any;
    public static subarray(uintarr: Uint8Array, begin?: number, end?: number): Uint8Array;
    public static k_combinations(list: any[], k: number): Generator;
}

export class HashMap<K, V> {
    public length: number;
    constructor(fnHash?: (o: object) => string);
    public get(key: K): V | undefined;
    public put(key: K, value: V): void;
    public remove(key: K): void;
    public clear(): void;
    public contains(key: K): boolean;
    public keys(): K[];
    public keyIterator(): Iterator<K>;
    public values(): V[];
    public valueIterator(): Iterator<V>;
    public entries(): Array<[K, V]>;
    public entryIterator(): Iterator<[K, V]>;
    public isEmpty(): boolean;
}

export class HashSet<V> {
    public [Symbol.iterator]: Iterator<V>;
    public length: number;
    constructor(fnHash?: (o: object) => string);
    public add(value: V): void;
    public addAll(collection: Iterable<V>): void;
    public get(value: V): V | undefined;
    public remove(value: V): void;
    public removeAll(collection: V[]): void;
    public clear(): void;
    public contains(value: V): boolean;
    public values(): V[];
    public valueIterator(): Iterator<V>;
    public isEmpty(): boolean;
}

export class LimitHashSet {
    public [Symbol.iterator]: Iterator<any>;
    public length: number;
    constructor(limit: number, fnHash?: (o: object) => string);
    public add(value: any): void;
    public addAll(collection: Iterable<any>): void;
    public get(value: any): any;
    public remove(value: any): void;
    public removeAll(collection: any[]): void;
    public clear(): void;
    public contains(value: any): boolean;
    public values(): any[];
    public valueIterator(): Iterator<any>;
    public isEmpty(): boolean;
}

export class InclusionHashSet<V> {
    public [Symbol.iterator]: Iterator<string>;
    public length: number;
    constructor(fnHash?: (o: object) => string);
    public add(value: V): void;
    public addAll(collection: Iterable<V>): void;
    public remove(value: V): void;
    public removeAll(collection: V[]): void;
    public clear(): void;
    public contains(value: V): boolean;
    public values(): string[];
    public valueIterator(): Iterator<string>;
    public isEmpty(): boolean;
    public clone(): InclusionHashSet<V>;
}

export class LimitInclusionHashSet {
    public [Symbol.iterator]: Iterator<any>;
    public length: number;
    constructor(limit: number, fnHash?: (o: object) => string);
    public add(value: any): void;
    public addAll(collection: Iterable<any>): void;
    public remove(value: any): void;
    public removeAll(collection: any[]): void;
    public clear(): void;
    public contains(value: any): boolean;
    public values(): any[];
    public valueIterator(): Iterator<any>;
    public isEmpty(): boolean;
    public clone(): LimitInclusionHashSet;
}

export class LimitIterable<T> {
    public static iterator<V>(iterator: Iterator<V>, limit: number): { next: () => object };
    constructor(it: Iterable<T> | Iterator<T>, limit: number);
    public [Symbol.iterator](): { next: () => object };
}

export class LinkedList {
    public first: any;
    public last: any;
    public length: number;
    constructor(...args: any[]);
    public push(value: any): void;
    public unshift(value: any): void;
    public pop(): any;
    public shift(): any;
    public clear(): void;
    public [Symbol.iterator](): Iterator<any>;
    public iterator(): Iterator<any>;
    public isEmpty(): boolean;
}

export class UniqueLinkedList extends LinkedList {
    constructor(fnHash: (o: object) => string);
    public push(value: any, moveBack?: boolean): void;
    public unshift(value: any): void;
    public pop(): any;
    public shift(): any;
    public clear(): void;
    public get(value: any): any;
    public contains(value: any): boolean;
    public remove(value: any): void;
    public moveBack(value: any): void;
}

export class Queue {
    public length: number;
    constructor(...args: any[]);
    public enqueue(value: any): void;
    public enqueueAll(values: any[]): void;
    public dequeue(): any;
    public dequeueMulti(count: number): any[];
    public peek(): any;
    public clear(): void;
    public isEmpty(): boolean;
}

export class UniqueQueue extends Queue {
    constructor(fnHash: (o: object) => string);
    public contains(value: any): boolean;
    public remove(value: any): void;
    public requeue(value: any): void;
}

export class ThrottledQueue extends UniqueQueue {
    public available: number;
    constructor(
        maxAtOnce?: number,
        allowanceNum?: number,
        allowanceInterval?: number,
        maxSize?: number,
        allowanceCallback?: () => any,
    );
    public stop(): void;
    public enqueue(value: any): void;
    public dequeue(): any;
    public dequeueMulti(count: number): any[];
    public isAvailable(): boolean;
}

export class SortedList {
    public length: number;
    constructor([sortedList]: any[], compare?: (a: any, b: any) => -1 | 0 | 1);
    public indexOf(o: any): number;
    public add(value: any): void;
    public shift(): any;
    public pop(): any;
    public peekFirst(): any;
    public peekLast(): any;
    public remove(value: any): void;
    public clear(): void;
    public values(): any[];
    public [Symbol.iterator](): Iterator<any>;
    public copy(): SortedList;
}

export class Assert {
    public static that(condition: boolean, message?: string): void;
}

export class CryptoUtils {
    public static SHA512_BLOCK_SIZE: 128;
    public static computeHmacSha512(key: Uint8Array, data: Uint8Array): Uint8Array;
    public static computePBKDF2sha512(password: Uint8Array, salt: Uint8Array, iterations: number, derivedKeyLength: number): SerialBuffer;
    public static otpKdfLegacy(message: Uint8Array, key: Uint8Array, salt: Uint8Array, iterations: number): Promise<Uint8Array>;
    public static otpKdf(message: Uint8Array, key: Uint8Array, salt: Uint8Array, iterations: number): Promise<Uint8Array>;
}

export class BufferUtils {
    public static BASE64_ALPHABET: string;
    public static BASE32_ALPHABET: {
        RFC4648: string;
        RFC4648_HEX: string;
        NIMIQ: string;
    };
    public static HEX_ALPHABET: string;
    public static toAscii(buffer: Uint8Array): string;
    public static fromAscii(string: string): SerialBuffer;
    public static toBase64(buffer: Uint8Array): string;
    public static fromBase64(base64: string, length?: number): SerialBuffer;
    public static toBase64Url(buffer: Uint8Array): string;
    public static fromBase64Url(base64: string, length?: number): SerialBuffer;
    public static toBase32(buf: Uint8Array, alphabet?: string): string;
    public static fromBase32(base32: string, alphabet?: string): Uint8Array;
    public static toHex(buffer: Uint8Array): string;
    public static fromHex(hex: string, length?: number): SerialBuffer;
    public static toBinary(buffer: Uint8Array): string;
    public static fromUtf8(str: string): Uint8Array;
    public static fromAny(o: Uint8Array | string, length?: number): SerialBuffer;
    public static concatTypedArrays(a: Uint8Array | Uint16Array | Uint32Array, b: Uint8Array | Uint16Array | Uint32Array): Uint8Array | Uint16Array | Uint32Array;
    public static equals(a: Uint8Array | Uint16Array | Uint32Array, b: Uint8Array | Uint16Array | Uint32Array): boolean;
    public static compare(a: Uint8Array | Uint16Array | Uint32Array, b: Uint8Array | Uint16Array | Uint32Array): -1 | 0 | 1;
    public static xor(a: Uint8Array, b: Uint8Array): Uint8Array;
}

export class SerialBuffer extends Uint8Array {
    public static EMPTY: SerialBuffer;
    public static varUintSize(value: number): number;
    public static varLengthStringSize(value: string): number;
    public readPos: number;
    public writePos: number;
    constructor(bufferOrArrayOrLength: any)
    public subarray(start?: number, end?: number): Uint8Array;
    public reset(): void;
    public read(length: number): Uint8Array;
    public write(array: any): void;
    public readUint8(): number;
    public writeUint8(value: number): void;
    public readUint16(): number;
    public writeUint16(value: number): void;
    public readUint32(): number;
    public writeUint32(value: number): void;
    public readUint64(): number;
    public writeUint64(value: number): void;
    public readVarUint(): number;
    public writeVarUint(value: number): void;
    public readFloat64(): number;
    public writeFloat64(value: number): void;
    public readString(length: number): string;
    public writeString(value: string, length: number): void;
    public readPaddedString(length: number): string;
    public writePaddedString(value: string, length: number): void;
    public readVarLengthString(): string;
    public writeVarLengthString(value: string): void;
}

export class Synchronizer extends Observable {
    public working: boolean;
    public length: number;
    public totalElapsed: number;
    public totalJobs: number;
    public totalThrottles: number;
    constructor(throttleAfter: number, throttleWait: number);
    public push<T>(fn: () => T): Promise<T>;
    public clear(): void;
}

export class MultiSynchronizer extends Observable {
    constructor(throttleAfter: number, throttleWait: number);
    public push<T>(tag: string, fn: () => T): Promise<T>;
    public clear(): void;
    public isWorking(tag: string): boolean;
}

export class PrioritySynchronizer extends Observable {
    public working: boolean;
    public length: number;
    public totalElapsed: number;
    public totalJobs: number;
    public totalThrottles: number;
    constructor(
        numPriorities: number,
        throttleAfter?: number,
        throttleWait?: number,
    );
    public push<T>(priority: number, fn: () => T): Promise<T>;
    public clear(): void;
}

export class RateLimit {
    public lastReset: number;
    constructor(allowedOccurrences: number, timeRange?: number);
    public note(number?: number): boolean;
}

export class IWorker {
    public static areWorkersAsync: boolean;
    public static createProxy(clazz: any, name: string, worker: Worker): IWorker.Proxy;
    public static startWorkerForProxy(clazz: any, name: string, workerScript: string): IWorker.Proxy;
    public static stubBaseOnMessage(msg: { data: { command: string, args: any[], id: number | string } }): Promise<void>;
    public static prepareForWorkerUse(baseClazz: any, impl: any): void;
}

export namespace IWorker {
    type Proxy = (clazz: any) => any;
    function Stub(clazz: any): any;
    function Pool(clazz: any): any;
}

export class WasmHelper {
    public static doImport(): Promise<void>;
    public static importWasm(wasm: string, module?: string): Promise<boolean>;
    public static importScript(script: string, module?: string): Promise<boolean>;
    public static fireModuleLoaded(module?: string): void;
}

export class CryptoWorker {
    public static lib: CryptoLib;
    public static getInstanceAsync(): Promise<CryptoWorkerImpl>;
    public computeArgon2d(input: Uint8Array): Promise<Uint8Array>;
    public computeArgon2dBatch(input: Uint8Array[]): Promise<Uint8Array[]>;
    public kdfLegacy(key: Uint8Array, salt: Uint8Array, iterations: number, outputSize: number): Promise<Uint8Array>;
    public kdf(key: Uint8Array, salt: Uint8Array, iterations: number, outputSize: number): Promise<Uint8Array>;
    public blockVerify(block: Uint8Array, transactionValid: boolean[], timeNow: number, genesisHash: Uint8Array, networkId: number): Promise<{ valid: boolean, pow: SerialBuffer, interlinkHash: SerialBuffer, bodyHash: SerialBuffer }>;
}

export class CryptoWorkerImpl extends IWorker.Stub(CryptoWorker) {
    constructor();
    public init(name: string): Promise<void>;
    public computeArgon2d(input: Uint8Array): Uint8Array;
    public computeArgon2dBatch(input: Uint8Array[]): Uint8Array[];
    public kdfLegacy(key: Uint8Array, salt: Uint8Array, iterations: number, outputSize: number): Uint8Array;
    public kdf(key: Uint8Array, salt: Uint8Array, iterations: number, outputSize: number): Uint8Array;
    public blockVerify(block: Uint8Array, transactionValid: boolean[], timeNow: number, genesisHash: Uint8Array, networkId: number): Promise<{ valid: boolean, pow: SerialBuffer, interlinkHash: SerialBuffer, bodyHash: SerialBuffer }>;
}

export class CRC8 {
    public static compute(buf: Uint8Array): number;
}

export class CRC32 {
    public static compute(buf: Uint8Array): number;
}

export class BigNumber {
    constructor(n: number | string | BigNumber, b: number);
    public CloseEvent(configObject: any): BigNumber;
    public config(obj: any): any;
    public set(obj: any): any;
    public isBigNumber(v: any): boolean;
    public maximum(...args: BigNumber[]): BigNumber;
    public max(...args: BigNumber[]): BigNumber;
    public minimum(...args: BigNumber[]): BigNumber;
    public min(...args: BigNumber[]): BigNumber;
    public random(db: number): BigNumber;
}

export class NumberUtils {
    public static UINT8_MAX: 255;
    public static UINT16_MAX: 65535;
    public static UINT32_MAX: 4294967295;
    public static UINT64_MAX: number;
    public static isUint8(val: unknown): boolean;
    public static isUint16(val: unknown): boolean;
    public static isUint32(val: unknown): boolean;
    public static isUint64(val: unknown): boolean;
    public static randomUint32(): number;
    public static randomUint64(): number;
    public static fromBinary(bin: string): number;
}

export class MerkleTree {
    public static computeRoot(values: any[], fnHash?: (o: any) => Hash): Hash;
}

export class MerklePath {
    public static compute(values: any[], leafValue: any, fnHash?: (o: any) => Hash): MerklePath;
    public static unserialize(buf: SerialBuffer): MerklePath;
    public serializedSize: number;
    public nodes: MerklePathNode[];
    constructor(nodes: MerklePathNode[]);
    public computeRoot(leafValue: any, fnHash?: (o: any) => Hash): Hash;
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: MerklePath): boolean;
}

export class MerklePathNode {
    public hash: Hash;
    public left: boolean;
    constructor(hash: Hash, left: boolean);
    public equals(o: MerklePathNode): boolean;
}

export class MerkleProof {
    public static Operation: {
        CONSUME_PROOF: 0;
        CONSUME_INPUT: 1;
        HASH: 2;
    };
    public static compute(values: any[], leafValues: any[], fnHash?: (o: any) => Hash): MerkleProof;
    public static computeWithAbsence(values: any[], leafValues: any[], fnCompare: (a: any, b: any) => number, fnHash?: (o: any) => Hash): MerkleProof;
    public static unserialize(buf: SerialBuffer): MerkleProof;
    public serializedSize: number;
    public nodes: Hash[];
    constructor(hashes: any[], operations: MerkleProof.Operation[]);
    public computeRoot(leafValues: any[], fnHash?: (o: any) => Hash): Hash;
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: MerkleProof): boolean;
}

export namespace MerkleProof {
    type Operation = Operation.CONSUME_PROOF | Operation.CONSUME_INPUT | Operation.HASH;
    namespace Operation {
        type CONSUME_PROOF = 0;
        type CONSUME_INPUT = 1;
        type HASH = 2;
    }
}

export class PlatformUtils {
    public static readonly userAgentString: string;
    public static readonly hardwareConcurrency: number;
    public static isBrowser(): boolean;
    public static isWeb(): boolean;
    public static isNodeJs(): boolean;
    public static supportsWebRTC(): boolean;
    public static supportsWS(): boolean;
    public static isOnline(): boolean;
    public static isWindows(): boolean;
}

export class StringUtils {
    public static isMultibyte(str: string): boolean;
    public static isHex(str: string): boolean;
    public static isHexBytes(str: string, length?: number): boolean;
    public static commonPrefix(str1: string, str2: string): string;
    public static lpad(str: string, padString: string, length: number): string;
}

export class Policy {
    public static BLOCK_TIME: 60;
    public static BLOCK_SIZE_MAX: 1e5;
    public static BLOCK_TARGET_MAX: BigNumber;
    public static DIFFICULTY_BLOCK_WINDOW: 120;
    public static DIFFICULTY_MAX_ADJUSTMENT_FACTOR: 2;
    public static TRANSACTION_VALIDITY_WINDOW: 120;
    public static LUNAS_PER_COIN: 1e5;
    public static SATOSHIS_PER_COIN: 1e5;
    public static TOTAL_SUPPLY: 21e14;
    public static INITIAL_SUPPLY: 252000000000000;
    public static EMISSION_SPEED: number;
    public static EMISSION_TAIL_START: 48692960;
    public static EMISSION_TAIL_REWARD: 4000;
    public static NUM_BLOCKS_VERIFICATION: 250;
    public static coinsToLunas(coins: number): number;
    public static coinsToSatoshis(coins: number): number;
    public static lunasToCoins(lunas: number): number;
    public static satoshisToCoins(satoshis: number): number;
    public static supplyAfter(blockHeight: number): number;
    public static blockRewardAt(blockHeight: number): number;
}

export abstract class Serializable {
    public equals(o: Serializable): boolean;
    public compare(o: Serializable): number;
    public hashCode(): string;
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public toString(): string;
    public toBase64(): string;
    public toHex(): string;
}

export class Hash extends Serializable {
    public static SIZE: Map<Hash.Algorithm, number>;
    public static NULL: Hash;
    public static Algorithm: {
        BLAKE2B: 1;
        ARGON2D: 2;
        SHA256: 3;
        SHA512: 4;
        toString(hashAlgorithm: Hash.Algorithm): string;
        fromAny(algorithm: Hash.Algorithm | string): Hash.Algorithm;
    };
    public static light(arr: Uint8Array): Hash;
    public static blake2b(arr: Uint8Array): Hash;
    public static hard(arr: Uint8Array): Promise<Hash>;
    public static argon2d(arr: Uint8Array): Promise<Hash>;
    public static sha256(arr: Uint8Array): Hash;
    public static sha512(arr: Uint8Array): Hash;
    public static compute(arr: Uint8Array, algorithm: Hash.Algorithm.BLAKE2B | Hash.Algorithm.SHA256): Hash;
    public static unserialize(buf: SerialBuffer, algorithm?: Hash.Algorithm): Hash;
    public static fromAny(hash: Hash | Uint8Array | string, algorithm?: Hash.Algorithm): Hash;
    public static fromBase64(base64: string): Hash;
    public static fromHex(hex: string): Hash;
    public static fromPlain(str: string): Hash;
    public static fromString(str: string): Hash;
    public static isHash(o: any): boolean;
    public static getSize(algorithm: Hash.Algorithm): number;
    public static computeBlake2b(input: Uint8Array): Uint8Array;
    public static computeSha256(input: Uint8Array): Uint8Array;
    public static computeSha512(input: Uint8Array): Uint8Array;
    public serializedSize: number;
    public array: Uint8Array;
    public algorithm: Hash.Algorithm;
    constructor(arg?: Uint8Array, algorithm?: Hash.Algorithm);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public subarray(begin?: number, end?: number): Uint8Array;
    public toPlain(): string;
    public equals(o: Serializable): boolean;
}

export namespace Hash {
    type Algorithm = Algorithm.BLAKE2B | Algorithm.ARGON2D | Algorithm.SHA256 | Algorithm.SHA512;
    namespace Algorithm {
        type BLAKE2B = 1;
        type ARGON2D = 2;
        type SHA256 = 3;
        type SHA512 = 4;
    }
}

export class PrivateKey extends Secret {
    public static SIZE: 32;
    public static PURPOSE_ID: number;
    public static generate(): PrivateKey;
    public static unserialize(buf: SerialBuffer): PrivateKey;
    public serializedSize: number;
    constructor(arg: Uint8Array);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public overwrite(privateKey: PrivateKey): void;
    public equals(o: any): boolean;
}

export class PublicKey extends Serializable {
    public static SIZE: 32;
    public static copy(o: PublicKey): PublicKey;
    public static derive(privateKey: PrivateKey): PublicKey;
    public static sum(publicKeys: PublicKey[]): PublicKey;
    public static unserialize(buf: SerialBuffer): PublicKey;
    public static fromAny(o: PublicKey | Uint8Array | string): PublicKey;
    public serializedSize: number;
    constructor(arg: Uint8Array);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
    public hash(): Hash;
    public compare(o: PublicKey): number;
    public toAddress(): Address;
    public toPeerId(): PeerId;
}

export class KeyPair extends Serializable {
    public static LOCK_KDF_ROUNDS: 256;
    public static generate(): KeyPair;
    public static derive(privateKey: PrivateKey): KeyPair;
    public static fromHex(hexBuf: string): KeyPair;
    public static fromEncrypted(buf: SerialBuffer, key: Uint8Array): Promise<KeyPair>;
    public static unserialize(buf: SerialBuffer): KeyPair;
    public privateKey: PrivateKey;
    public publicKey: PublicKey;
    public serializedSize: number;
    public encryptedSize: number;
    public isLocked: boolean;
    constructor(
        privateKey: PrivateKey,
        publicKey: PublicKey,
        locked?: boolean,
        lockSalt?: Uint8Array,
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public exportEncrypted(key: Uint8Array): Promise<SerialBuffer>;
    public lock(key: string | Uint8Array): Promise<void>;
    public unlock(key: string | Uint8Array): Promise<void>;
    public relock(): void;
    public equals(o: any): boolean;
}

export class Secret extends Serializable {
    public static SIZE: 32;
    public static ENCRYPTION_SALT_SIZE: 16;
    public static ENCRYPTION_KDF_ROUNDS: 256;
    public static ENCRYPTION_CHECKSUM_SIZE: 4;
    public static ENCRYPTION_CHECKSUM_SIZE_V3: 2;
    public static Type: {
        PRIVATE_KEY: 1,
        ENTROPY: 2,
    };
    public static fromEncrypted(buf: SerialBuffer, key: Uint8Array): Promise<PrivateKey|Entropy>;
    public encryptedSize: number;
    public type: Secret.Type;
    constructor(type: Secret.Type, purposeId: number);
    public exportEncrypted(key: Uint8Array): Promise<SerialBuffer>;
}

export namespace Secret {
    type Type = Type.PRIVATE_KEY|Type.ENTROPY;
    namespace Type {
        type PRIVATE_KEY = 1;
        type ENTROPY = 2;
    }
}

export class Entropy extends Secret {
    public static SIZE: 32;
    public static PURPOSE_ID: number;
    public static generate(): Entropy;
    public static unserialize(buf: SerialBuffer): Entropy;
    public serializedSize: number;
    constructor(arg: Uint8Array);
    public toExtendedPrivateKey(password?: string, wordlist?: string[]): ExtendedPrivateKey;
    public toMnemonic(wordlist?: string[]): string[];
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public overwrite(entropy: Entropy): void;
    public equals(o: any): boolean;
}

export class ExtendedPrivateKey extends Serializable {
    public static CHAIN_CODE_SIZE: 32;
    public static generateMasterKey(seed: Uint8Array): ExtendedPrivateKey;
    public static isValidPath(path: string): boolean;
    public static derivePathFromSeed(path: string, seed: Uint8Array): ExtendedPrivateKey;
    public static unserialize(buf: SerialBuffer): ExtendedPrivateKey;
    public serializedSize: number;
    public privateKey: PrivateKey;
    constructor(key: PrivateKey, chainCode: Uint8Array);
    public derive(index: number): ExtendedPrivateKey;
    public derivePath(path: string): ExtendedPrivateKey;
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
    public toAddress(): Address;
}

export class RandomSecret extends Serializable {
    public static SIZE: 32;
    public static unserialize(buf: SerialBuffer): RandomSecret;
    public serializedSize: number;
    constructor(arg: Uint8Array);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
}

export class Signature extends Serializable {
    public static SIZE: 64;
    public static copy(o: Signature): Signature;
    public static create(privateKey: PrivateKey, publicKey: PublicKey, data: Uint8Array): Signature;
    public static fromPartialSignatures(commitment: Commitment, signatures: PartialSignature[]): Signature;
    public static unserialize(buf: SerialBuffer): Signature;
    public static fromAny(o: Signature | Uint8Array | string): Signature;
    public serializedSize: number;
    constructor(args: Uint8Array);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public verify(publicKey: PublicKey, data: Uint8Array): boolean;
    public equals(o: any): boolean;
}

export class Commitment extends Serializable {
    public static SIZE: 32;
    public static copy(o: Commitment): Commitment;
    public static sum(commitments: Commitment[]): Commitment;
    public static unserialize(buf: SerialBuffer): Commitment;
    public serializedSize: number;
    constructor(arg: Uint8Array);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
}

export class CommitmentPair extends Serializable {
    public static SERIALIZED_SIZE: 96;
    public static RANDOMNESS_SIZE: 32;
    public static generate(): CommitmentPair;
    public static unserialize(buf: SerialBuffer): CommitmentPair;
    public static fromHex(hexBuf: string): CommitmentPair;
    public secret: RandomSecret;
    public commitment: Commitment;
    public serializedSize: number;
    constructor(secret: RandomSecret, commitment: Commitment);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
}

export class PartialSignature extends Serializable {
    public static SIZE: 32;
    public static create(privateKey: PrivateKey, publicKey: PublicKey, publicKeys: PublicKey[], secret: RandomSecret, aggregateCommitment: Commitment, data: Uint8Array): PartialSignature;
    public static unserialize(buf: SerialBuffer): PartialSignature;
    public serializedSize: number;
    constructor(arg: Uint8Array);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
}

export class MnemonicUtils {
    public static ENGLISH_WORDLIST: string[];
    public static DEFAULT_WORDLIST: string[];
    public static MnemonicType: {
        UNKNOWN: -1;
        LEGACY: 0;
        BIP39: 1;
    };
    public static entropyToMnemonic(entropy: string | ArrayBuffer | Uint8Array | Entropy, wordlist?: string[]): string[];
    public static entropyToLegacyMnemonic(entropy: string | ArrayBuffer | Uint8Array | Entropy, wordlist?: string[]): string[];
    public static mnemonicToEntropy(mnemonic: string | string[], wordlist?: string[]): Entropy;
    public static legacyMnemonicToEntropy(mnemonic: string | string[], wordlist?: string[]): Entropy;
    public static mnemonicToSeed(mnemonic: string | string[], password?: string): SerialBuffer;
    public static mnemonicToExtendedPrivateKey(mnemonic: string | string[], password?: string): ExtendedPrivateKey;
    public static isCollidingChecksum(entropy: Entropy): boolean;
    public static getMnemonicType(mnemonic: string | string[], wordlist?: string[]): MnemonicUtils.MnemonicType;
}

export namespace MnemonicUtils {
    type MnemonicType = MnemonicType.LEGACY | MnemonicType.BIP39 | MnemonicType.UNKNOWN;
    namespace MnemonicType {
        type UNKNOWN = -1;
        type LEGACY = 0;
        type BIP39 = 1;
    }
}

export class Address extends Serializable {
    public static CCODE: 'NQ';
    public static SERIALIZED_SIZE: 20;
    public static HEX_SIZE: 40;
    public static NULL: Address;
    public static CONTRACT_CREATION: Address;
    public static copy(o: Address): Address;
    public static fromHash(hash: Hash): Address;
    public static unserialize(buf: SerialBuffer): Address;
    public static fromString(str: string): Address;
    public static fromBase64(base64: string): Address;
    public static fromHex(hex: string): Address;
    public static fromUserFriendlyAddress(str: string): Address;
    public static fromAny(addr: Address | string): Address;
    public serializedSize: number;
    constructor(arg: Uint8Array);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public subarray(begin?: number, end?: number): Uint8Array;
    public equals(o: Address): boolean;
    public toPlain(): string;
    public toUserFriendlyAddress(withSpaces?: boolean): string;
}

export abstract class Account {
    public static Type: {
        BASIC: 0;
        VESTING: 1;
        HTLC: 2;
        toString(type: Account.Type): string;
        fromAny(type: Account.Type | string): Account.Type;
    };
    public static TYPE_MAP: Map<Account.Type, typeof Account>;
    public static BalanceError: Error;
    public static DoubleTransactionError: Error;
    public static ProofError: Error;
    public static ValidityError: Error;
    public static unserialize(buf: SerialBuffer): Account;
    public static dataToPlain(data: Uint8Array): {};
    public static proofToPlain(proof: Uint8Array): {};
    public static fromAny(o: Account | {type: Account.Type | string, balance: number}): Account;
    public static fromPlain(plain: {type: Account.Type | string, balance: number}): Account;
    public serializedSize: number;
    public balance: number;
    public type: Account.Type;
    constructor(type: Account.Type, balance: number);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
    public toString(): string;
    public toPlain(): {
        type: string,
        balance: number,
    };
    public withBalance(balance: number): Account;
    public withOutgoingTransaction(transaction: Transaction, blockHeight: number, transactionCache: TransactionCache, revert?: boolean): Account;
    public withIncomingTransaction(transaction: Transaction, blockHeight: number, revert?: boolean): Account;
    public withContractCommand(transaction: Transaction, blockHeight: number, revert?: boolean): Account;
    public isInitial(): boolean;
    public isToBePruned(): boolean;
}

export namespace Account {
    type Type = Type.BASIC | Type.VESTING | Type.HTLC;
    namespace Type {
        type BASIC = 0;
        type VESTING = 1;
        type HTLC = 2;
    }
}

export class PrunedAccount {
    public static unserialize(buf: SerialBuffer): PrunedAccount;
    public static fromAny(o: PrunedAccount | object): PrunedAccount;
    public static fromPlain(plain: object): PrunedAccount;
    public address: Address;
    public account: Account;
    public serializedSize: number;
    constructor(address: Address, account: Account);
    public compare(o: PrunedAccount): number;
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public hashCode(): string;
    public toPlain(): {
        address: string,
        account: object,
    };
}

export class BasicAccount extends Account {
    public static INITIAL: BasicAccount;
    public static copy(o: BasicAccount): BasicAccount;
    public static unserialize(buf: SerialBuffer): BasicAccount;
    public static fromPlain(o: {balance: number}): BasicAccount;
    public static verifyOutgoingTransaction(transaction: Transaction): boolean;
    public static verifyIncomingTransaction(transaction: Transaction): boolean;
    public static proofToPlain(proof: Uint8Array): {
        signature: string,
        publicKey: string,
        signer: string,
        pathLength: number,
    } | {};
    public static dataToPlain(data: Uint8Array): {};
    constructor(balance?: number);
    public equals(o: any): boolean;
    public toString(): string;
    public withBalance(balance: number): Account;
    public withIncomingTransaction(transaction: Transaction, blockHeight: number, revert?: boolean): Account;
    public withContractCommand(transaction: Transaction, blockHeight: number, revert?: boolean): Account;
    public isInitial(): boolean;
}

export class Contract extends Account {
    public static verifyIncomingTransaction(transaction: Transaction): boolean;
    constructor(type: Account.Type, balance: number);
    public withIncomingTransaction(transaction: Transaction, blockHeight: number, revert?: boolean): Account;
    public withContractCommand(transaction: Transaction, blockHeight: number, revert?: boolean): BasicAccount | Contract;
}

export class HashedTimeLockedContract extends Contract {
    public static ProofType: {
        REGULAR_TRANSFER: 1;
        EARLY_RESOLVE: 2;
        TIMEOUT_RESOLVE: 3;
        toString(proofType: HashedTimeLockedContract.ProofType): string;
    };
    public static create(balance: number, blockHeight: number, transaction: Transaction): HashedTimeLockedContract;
    public static unserialize(buf: SerialBuffer): HashedTimeLockedContract;
    public static fromPlain(plain: object): HashedTimeLockedContract;
    public static verifyOutgoingTransaction(transaction: Transaction): boolean;
    public static verifyIncomingTransaction(transaction: Transaction): boolean;
    public static dataToPlain(data: Uint8Array): {
        sender: string,
        recipient: string,
        hashAlgorithm: string,
        hashRoot: string,
        hashCount: number,
        timeout: number,
    } | {};
    public static proofToPlain(proof: Uint8Array): {
        type: 'regular-transfer',
        hashAlgorithm: string,
        hashDepth: number,
        hashRoot: string,
        preImage: string,
        signer: string,
        signature: string,
        publicKey: string,
        pathLength: number,
    } | {
        type: 'early-resolve',
        signer: string,
        signature: string,
        publicKey: string,
        pathLength: number,
        creator: string,
        creatorSignature: string,
        creatorPublicKey: string,
        creatorPathLength: number,
    } | {
        type: 'timeout-resolve',
        creator: string,
        creatorSignature: string,
        creatorPublicKey: string,
        creatorPathLength: number,
    } | {};
    public serializedSize: number;
    public sender: Address;
    public recipient: Address;
    public hashRoot: Hash;
    public hashCount: number;
    public timeout: number;
    public totalAmount: number;
    constructor(
        balance?: number,
        sender?: Address,
        recipient?: Address,
        hashRoot?: Hash,
        hashCount?: number,
        timeout?: number,
        totalAmount?: number,
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public toString(): string;
    public toPlain(): {
        type: string,
        balance: number,
        sender: string,
        recipient: string,
        hashAlgorithm: string,
        hashRoot: string,
        hashCount: number,
        timeout: number,
        totalAmount: number,
    };
    public equals(o: any): boolean;
    public withBalance(balance: number): Account;
    public withOutgoingTransaction(transaction: Transaction, blockHeight: number, transactionCache: TransactionCache, revert?: boolean): Account;
    public withIncomingTransaction(transaction: Transaction, blockHeight: number, revert?: boolean): Account;
}

export namespace HashedTimeLockedContract {
    type ProofType = ProofType.REGULAR_TRANSFER | ProofType.EARLY_RESOLVE | ProofType.TIMEOUT_RESOLVE;
    namespace ProofType {
        type REGULAR_TRANSFER = 1;
        type EARLY_RESOLVE = 2;
        type TIMEOUT_RESOLVE = 3;
    }
}

export class VestingContract extends Contract {
    public static create(balance: number, blockHeight: number, transaction: Transaction): VestingContract;
    public static unserialize(buf: SerialBuffer): VestingContract;
    public static fromPlain(plain: object): VestingContract;
    public static verifyOutgoingTransaction(transaction: Transaction): boolean;
    public static verifyIncomingTransaction(transaction: Transaction): boolean;
    public static dataToPlain(data: Uint8Array): {
        owner: string,
        vestingStart: number,
        vestingStepBlocks: number,
        vestingStepAmount: number,
        vestingTotalAmount: number,
    } | {};
    public static proofToPlain(proof: Uint8Array): {
        signature: string,
        publicKey: string,
        signer: string,
        pathLength: number,
    };
    public serializedSize: number;
    public owner: Address;
    public vestingStart: number;
    public vestingStepBlocks: number;
    public vestingStepAmount: number;
    public vestingTotalAmount: number;
    constructor(
        balance?: number,
        owner?: Address,
        vestingStart?: number,
        vestingStepBlocks?: number,
        vestingStepAmount?: number,
        vestingTotalAmount?: number,
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public toString(): string;
    public toPlain(): {
        type: string,
        balance: number,
        owner: string,
        vestingStart: number,
        vestingStepBlocks: number,
        vestingStepAmount: number,
        vestingTotalAmount: number,
    };
    public equals(o: any): boolean;
    public withBalance(balance: number): Account;
    public withOutgoingTransaction(transaction: Transaction, blockHeight: number, transactionCache: TransactionCache, revert?: boolean): Account;
    public withIncomingTransaction(transaction: Transaction, blockHeight: number, revert?: boolean): Account;
    public getMinCap(blockHeight: number): number;
}

export class AccountsTreeNode {
    public static BRANCH: 0x00;
    public static TERMINAL: 0xff;
    public static terminalNode(prefix: string, account: Account): AccountsTreeNode;
    public static branchNode(prefix: string, childrenSuffixes?: string[], childrenHashes?: Hash[]): AccountsTreeNode;
    public static isTerminalType(type: number): boolean;
    public static isBranchType(type: number): boolean;
    public static unserialize(buf: SerialBuffer): AccountsTreeNode;
    public serializedSize: number;
    public account: Account;
    public prefix: string;
    constructor(
        type: number,
        prefix: string,
        arg: Account | string[],
        arg2?: Hash[],
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public getChildHash(prefix: string): false | Hash;
    public getChild(prefix: string): false | string;
    public withChild(prefix: string, childHash: Hash): AccountsTreeNode;
    public withoutChild(prefix: string): AccountsTreeNode;
    public hasChildren(): boolean;
    public hasSingleChild(): boolean;
    public getFirstChild(): undefined | string;
    public getLastChild(): undefined | string;
    public getChildren(): undefined | string[];
    public withAccount(account: Account): AccountsTreeNode;
    public hash(): Hash;
    public isChildOf(parent: AccountsTreeNode): boolean;
    public isTerminal(): boolean;
    public isBranch(): boolean;
    public equals(o: any): boolean;
}

export class AccountsTreeStore {
    public static initPersistent(jdb: any): void;
    public static getPersistent(jdb: any): AccountsTreeStore;
    public static createVolatile(): AccountsTreeStore;
    public tx: any;
    constructor(store: any);
    public get(key: string): Promise<AccountsTreeNode>;
    public put(node: AccountsTreeNode): Promise<string>;
    public remove(node: AccountsTreeNode): Promise<string>;
    public getRootNode(): Promise<AccountsTreeNode>;
    public getTerminalNodes(startPrefix: string, size: number): Promise<AccountsTreeNode[]>;
    public snapshot(tx?: AccountsTreeStore): AccountsTreeStore;
    public transaction(enableWatchdog?: boolean): AccountsTreeStore;
    public synchronousTransaction(enableWatchdog?: boolean): SynchronousAccountsTreeStore;
    public truncate(): Promise<void>;
    public commit(): Promise<boolean>;
    public abort(): Promise<void>;
}

export class AccountsTreeStoreCodec {
    public valueEncoding: { encode: (val: any) => any, decode: (val: any) => any, buffer: boolean, type: string } | void;
    public encode(obj: any): any;
    public decode(obj: any, key: string): any;
}

export class SynchronousAccountsTreeStore extends AccountsTreeStore {
    constructor(store: any);
    public preload(keys: string[]): void;
    public getSync(key: string, expectedToBePresent?: boolean): AccountsTreeNode;
    public putSync(node: AccountsTreeNode): string;
    public removeSync(node: AccountsTreeNode): string;
    public getRootNodeSync(): AccountsTreeNode;
}

export class AccountsProof {
    public static unserialize(buf: SerialBuffer): AccountsProof;
    public serializedSize: number;
    public length: number;
    public nodes: AccountsTreeNode[];
    constructor(nodes: AccountsTreeNode[]);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public verify(): boolean;
    public getAccount(address: Address): Account;
    public toString(): string;
    public root(): Hash;
}

export class AccountsTreeChunk {
    public static SIZE_MAX: number;
    public static EMPTY: AccountsTreeChunk;
    public static unserialize(buf: SerialBuffer): AccountsTreeChunk;
    public serializedSize: number;
    public terminalNodes: AccountsTreeNode[];
    public proof: AccountsProof;
    public head: AccountsTreeNode;
    public tail: AccountsTreeNode;
    public length: number;
    constructor(nodes: AccountsTreeNode[], proof: AccountsProof);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public verify(): boolean;
    public toString(): string;
    public root(): Hash;
}

export class AccountsTree extends Observable {
    public static getPersistent(jdb: any): Promise<AccountsTree>;
    public static createVolatile(): Promise<AccountsTree>;
    public tx: any;
    constructor(store: AccountsTreeStore);
    public put(address: Address, account: Account): Promise<void>;
    public get(address: Address): Promise<null | Account>;
    public getAccountsProof(addresses: Address[]): Promise<AccountsProof>;
    public getChunk(startPrefix: string, size: number): Promise<AccountsTreeChunk>;
    public transaction(enableWatchdog?: boolean): Promise<AccountsTree>;
    public synchronousTransaction(enableWatchdog?: boolean): Promise<SynchronousAccountsTree>;
    public partialTree(): Promise<PartialAccountsTree>;
    public snapshot(tx?: AccountsTree): Promise<AccountsTree>;
    public commit(): Promise<boolean>;
    public abort(): Promise<void>;
    public root(): Promise<Hash>;
    public isEmpty(): Promise<boolean>;
}

export class SynchronousAccountsTree extends AccountsTree {
    constructor(store: SynchronousAccountsTreeStore);
    public preloadAddresses(addresses: Address[]): Promise<void>;
    public putSync(address: Address, account: Account): void;
    public getSync(address: Address, expectedToBePresent?: boolean): null | Account;
    public rootSync(): Hash;
}

// @ts-ignore
export class PartialAccountsTree extends SynchronousAccountsTree {
    public static Status: {
        ERR_HASH_MISMATCH: -3;
        ERR_INCORRECT_PROOF: -2;
        ERR_UNMERGEABLE: -1;
        OK_COMPLETE: 0;
        OK_UNFINISHED: 1;
    };
    public complete: boolean;
    public missingPrefix: string;
    constructor(store: SynchronousAccountsTreeStore);
    public pushChunk(chunk: AccountsTreeChunk): Promise<PartialAccountsTree.Status>;
    // @ts-ignore
    public synchronousTransaction(enableWatchdog?: boolean): PartialAccountsTree;
    // @ts-ignore
    public transaction(enableWatchdog?: boolean): AccountsTree;
    public commit(): Promise<boolean>;
    public abort(): Promise<void>;
}

export namespace PartialAccountsTree {
    type Status = Status.ERR_HASH_MISMATCH | Status.ERR_INCORRECT_PROOF | Status.ERR_UNMERGEABLE | Status.OK_COMPLETE | Status.OK_UNFINISHED;
    namespace Status {
        type ERR_HASH_MISMATCH = -3;
        type ERR_INCORRECT_PROOF = -2;
        type ERR_UNMERGEABLE = -1;
        type OK_COMPLETE = 0;
        type OK_UNFINISHED = 1;
    }
}

export class Accounts extends Observable {
    public static getPersistent(jdb: any): Promise<Accounts>;
    public static createVolatile(): Promise<Accounts>;
    public tx: any;
    constructor(accountsTree: AccountsTree);
    public initialize(genesisBlock: Block, encodedAccounts: string): Promise<void>;
    public getAccountsProof(addresses: Address[]): Promise<AccountsProof>;
    public getAccountsTreeChunk(startPrefix: string): Promise<AccountsTreeChunk>;
    public commitBlock(block: Block, transactionCache: TransactionCache): Promise<void>;
    public commitBlockBody(body: BlockBody, blockHeight: number, transactionCache: TransactionCache): Promise<void>;
    public gatherToBePrunedAccounts(transactions: Transaction[], blockHeight: number, transactionCache: TransactionCache): Promise<PrunedAccount[]>;
    public revertBlock(block: Block, transactionCache: TransactionCache): Promise<void>;
    public revertBlockBody(body: BlockBody, blockHeight: number, transactionCache: TransactionCache): Promise<void>;
    public get(address: Address, accountType?: Account.Type, tree?: AccountsTree): Promise<Account>;
    public transaction(enableWatchdog?: boolean): Promise<Accounts>;
    public snapshot(tx: Accounts): Promise<Accounts>;
    public partialAccountsTree(): Promise<PartialAccountsTree>;
    public commit(): Promise<void>;
    public abort(): Promise<void>;
    public hash(): Promise<Hash>;
}

export class BlockHeader {
    public static CURRENT_VERSION: number;
    public static SUPPORTED_VERSIONS: number[];
    public static SERIALIZED_SIZE: 146;
    public static Version: {
        V1: 1;
    };
    public static unserialize(buf: SerialBuffer): BlockHeader;
    public serializedSize: number;
    public version: number;
    public prevHash: Hash;
    public interlinkHash: Hash;
    public bodyHash: Hash;
    public accountsHash: Hash;
    public nBits: number;
    public target: BigNumber;
    public difficulty: BigNumber;
    public height: number;
    public timestamp: number;
    public nonce: number;
    constructor(
        prevHash: Hash,
        interlinkHash: Hash,
        bodyHash: Hash,
        accountsHash: Hash,
        nBits: number,
        height: number,
        timestamp: number,
        nonce: number,
        version?: number,
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public verifyProofOfWork(buf?: SerialBuffer): Promise<boolean>;
    public isImmediateSuccessorOf(prevHeader: BlockHeader): boolean;
    public hash(buf?: SerialBuffer): Hash;
    public pow(buf?: SerialBuffer): Promise<Hash>;
    public equals(o: any): boolean;
    public toString(): string;
}

export namespace BlockHeader {
    type Version = Version.V1;
    namespace Version {
        type V1 = 1;
    }
}

export class BlockInterlink {
    public static unserialize(buf: SerialBuffer): BlockInterlink;
    public serializedSize: number;
    public hashes: Hash[];
    public length: number;
    constructor(
        hashes: Hash[],
        prevHash?: Hash,
        repeatBits?: Uint8Array,
        compressed?: Hash[],
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
    public hash(): Hash;
}

export class BlockBody {
    public static getMetadataSize(extraData: Uint8Array): number;
    public static unserialize(buf: SerialBuffer): BlockBody;
    public serializedSize: number;
    public extraData: Uint8Array;
    public minerAddr: Address;
    public transactions: Transaction[];
    public transactionCount: number;
    public prunedAccounts: PrunedAccount[];
    constructor(
        minerAddr: Address,
        transactions: Transaction[],
        extraData?: Uint8Array,
        prunedAccounts?: PrunedAccount[],
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public verify(): boolean;
    public getMerkleLeafs(): any[];
    public hash(): Hash;
    public equals(o: any): boolean;
    public getAddresses(): Address[];
}

export class BlockUtils {
    public static compactToTarget(compact: number): BigNumber;
    public static targetToCompact(target: BigNumber): number;
    public static getTargetHeight(target: BigNumber): number;
    public static getTargetDepth(target: BigNumber): number;
    public static compactToDifficulty(compact: number): BigNumber;
    public static difficultyToCompact(difficulty: BigNumber): number;
    public static difficultyToTarget(difficulty: BigNumber): BigNumber;
    public static targetToDifficulty(target: BigNumber): BigNumber;
    public static hashToTarget(hash: Hash): BigNumber;
    public static realDifficulty(hash: Hash): BigNumber;
    public static getHashDepth(hash: Hash): number;
    public static isProofOfWork(hash: Hash, target: BigNumber): boolean;
    public static isValidCompact(compact: number): boolean;
    public static isValidTarget(target: BigNumber): boolean;
    public static getNextTarget(headBlock: BlockHeader, tailBlock: BlockHeader, deltaTotalDifficulty: BigNumber): BigNumber;
}

export class Subscription {
    public static NONE: Subscription;
    public static BLOCKS_ONLY: Subscription;
    public static ANY: Subscription;
    public static Type: {
        NONE: 0;
        ANY: 1;
        ADDRESSES: 2;
        MIN_FEE: 3;
    };
    public static fromAddresses(addresses: Address[]): Subscription;
    public static fromMinFeePerByte(minFeePerByte: number): Subscription;
    public static unserialize(buf: SerialBuffer): Subscription;
    public serializedSize: number;
    public type: Subscription.Type;
    public addresses: Address[];
    public minFeePerByte: number;
    constructor(type: Subscription.Type, filter?: Address[] | number);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public matchesBlock(block: Block): boolean;
    public matchesTransaction(transaction: Transaction): boolean;
    public isSubsetOf(other: Subscription): boolean;
    public toString(): string;
}

export namespace Subscription {
    type Type = Type.NONE | Type.ANY | Type.ADDRESSES | Type.MIN_FEE;
    namespace Type {
        type NONE = 0;
        type ANY = 1;
        type ADDRESSES = 2;
        type MIN_FEE = 3;
    }
}

export abstract class Transaction {
    public static Format: {
        BASIC: 0;
        EXTENDED: 1;
        toString(format: Transaction.Format): string;
        fromAny(format: Transaction.Format | string): Transaction.Format;
    };
    public static Flag: {
        NONE: 0;
        CONTRACT_CREATION: 0b1;
    };
    public static FORMAT_MAP: Map<Transaction.Format, {unserialize: (buf: SerialBuffer) => Transaction, fromPlain: (plain: object) => Transaction}>;
    public static unserialize(buf: SerialBuffer): Transaction;
    public static fromPlain(plain: object): Transaction;
    public static fromAny(tx: Transaction | string | object): Transaction;
    public serializedContentSize: number;
    public serializedSize: number;
    public format: Transaction.Format;
    public sender: Address;
    public senderType: Account.Type;
    public recipient: Address;
    public recipientType: Account.Type;
    public value: number;
    public fee: number;
    public feePerByte: number;
    public networkId: number;
    public validityStartHeight: number;
    public flags: Transaction.Flag;
    public data: Uint8Array;
    public proof: Uint8Array;
    constructor(
        format: Transaction.Format,
        sender: Address,
        senderType: Account.Type,
        recipient: Address,
        recipientType: Account.Type,
        value: number,
        fee: number,
        validityStartHeight: number,
        flags: Transaction.Flag | any,
        data: Uint8Array,
        proof?: Uint8Array,
        networkId?: number,
    );
    public serializeContent(buf?: SerialBuffer): SerialBuffer;
    public verify(networkId?: number): boolean;
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public hash(): Hash;
    public compare(o: Transaction): -1 | 0 | 1;
    public compareBlockOrder(o: Transaction): -1 | 0 | 1;
    public equals(o: any): boolean;
    public toString(): string;
    public getContractCreationAddress(): Address;
    public hasFlag(flag: number): boolean;
    public toPlain(): {
        transactionHash: string,
        format: string;
        sender: string;
        senderType: string;
        recipient: string;
        recipientType: string;
        value: number;
        fee: number;
        feePerByte: number;
        validityStartHeight: number;
        network: string;
        flags: number;
        data: {raw: string};
        proof: {
            raw: string,
            signature?: string,
            publicKey?: string,
            signer?: string,
            pathLength?: number,
        };
        size: number;
        valid: boolean;
    };
}

export namespace Transaction {
    type Format = Format.BASIC | Format.EXTENDED;
    namespace Format {
        type BASIC = 0;
        type EXTENDED = 1;
    }
    type Flag = Flag.NONE | Flag.CONTRACT_CREATION;
    namespace Flag {
        type NONE = 0;
        type CONTRACT_CREATION = 0b1;
    }
}

export class SignatureProof {
    public static SINGLE_SIG_SIZE: number;
    public static verifyTransaction(transaction: Transaction): boolean;
    public static singleSig(publicKey: PublicKey, signature: Signature): SignatureProof;
    public static multiSig(signerKey: PublicKey, publicKeys: PublicKey[], signature: Signature): SignatureProof;
    public static unserialize(buf: SerialBuffer): SignatureProof;
    public serializedSize: number;
    public publicKey: PublicKey;
    public merklePath: MerklePath;
    public signature: Signature;
    constructor(
        publicKey: PublicKey,
        merklePath: MerklePath,
        signature: Signature,
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
    public verify(address: Address | null, data: Uint8Array): boolean;
    public isSignedBy(sender: Address): boolean;
}

export class BasicTransaction extends Transaction {
    public static unserialize(buf: SerialBuffer): BasicTransaction;
    public static fromPlain(plain: object): BasicTransaction;
    public serializedSize: number;
    public senderPubKey: PublicKey;
    public signature: Signature;
    constructor(
        senderPublicKey: PublicKey,
        recipient: Address,
        value: number,
        fee: number,
        validityStartHeight: number,
        signature?: Signature,
        networkId?: number,
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
}

export class ExtendedTransaction extends Transaction {
    public static unserialize(buf: SerialBuffer): ExtendedTransaction;
    public static fromPlain(plain: object): ExtendedTransaction;
    public serializedSize: number;
    constructor(
        sender: Address,
        senderType: Account.Type,
        recipient: Address,
        recipientType: Account.Type,
        value: number,
        fee: number,
        validityStartHeight: number,
        flags: Transaction.Flag | number,
        data: Uint8Array,
        proof?: Uint8Array,
        networkId?: number,
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
}

export class TransactionsProof {
    public static unserialize(buf: SerialBuffer): TransactionsProof;
    public serializedSize: number;
    public length: number;
    public transactions: Transaction[];
    public proof: MerkleProof;
    constructor(transactions: Transaction[], proof: MerkleProof);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public toString(): string;
    public root(): Hash;
}

export type BlockDescriptor = object;

export class TransactionCache {
    public missingBlocks: number;
    public transactions: InclusionHashSet<Hash>;
    public head: null | BlockDescriptor;
    public tail: null | BlockDescriptor;
    constructor(transactionHashes?: InclusionHashSet<Hash>, blockOrder?: BlockDescriptor[]);
    public containsTransaction(transaction: Transaction): boolean;
    public pushBlock(block: Block): void;
    public shiftBlock(): void;
    public revertBlock(block: Block): number;
    public prependBlocks(blocks: Block[]): void;
    public clone(): TransactionCache;
    public isEmpty(): boolean;
}

export class TransactionStoreEntry {
    public static fromBlock(block: Block): TransactionStoreEntry[];
    public static fromJSON(id: string, o: { transactionHashBuffer: Uint8Array, senderBuffer: Uint8Array, recipientBuffer: Uint8Array, blockHeight: number, blockHash: string, index: number }): TransactionStoreEntry;
    public transactionHash: Hash;
    public sender: Address;
    public recipient: Address;
    public blockHeight: number;
    public blockHash: Hash;
    public index: number;
    constructor(
        transactionHash: Hash,
        sender: Address,
        recipient: Address,
        blockHeight: number,
        blockHash: Hash,
        index: number,
    );
    public toJSON(): { transactionHashBuffer: Uint8Array, senderBuffer: Uint8Array, recipientBuffer: Uint8Array, blockHeight: number, blockHash: string, index: number };
}

export class TransactionStore {
    public static CURRENT_ID_KEY: number;
    public static initPersistent(jdb: any): void;
    public static getPersistent(jdb: any): TransactionStore;
    public static createVolatile(): TransactionStore;
    public tx: any;
    constructor(store: any);
    public get(transactionHash: Hash): Promise<TransactionStoreEntry>;
    public getBySender(sender: Address, limit?: number): Promise<TransactionStoreEntry[]>;
    public getByRecipient(recipient: Address, limit?: number): Promise<TransactionStoreEntry[]>;
    public put(block: Block): Promise<void>;
    public remove(block: Block): Promise<void>;
    public snapshot(tx: TransactionStore): TransactionStore;
    public transaction(enableWatchdog?: boolean): TransactionStore;
    public truncate(): Promise<void>;
    public commit(): Promise<boolean>;
    public abort(): Promise<void>;
}

export class TransactionStoreCodec {
    public valueEncoding: { encode: (val: any) => any, decode: (val: any) => any, buffer: boolean, type: string } | void;
    public encode(obj: any): any;
    public decode(obj: any, key: string): any;
}

export class TransactionReceipt {
    public static unserialize(buf: SerialBuffer): TransactionReceipt;
    public static fromPlain(o: object): TransactionReceipt;
    public static fromAny(o: TransactionReceipt | object | string): TransactionReceipt;
    public serializedSize: number;
    public transactionHash: Hash;
    public blockHash: Hash;
    public blockHeight: number;
    constructor(
        transactionHash: Hash,
        blockHash: Hash,
        blockHeight: number,
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
    public toPlain(): {
        transactionHash: string,
        blockHash: string,
        blockHeight: number,
    };
}

export class Block {
    public static TIMESTAMP_DRIFT_MAX: 600 /* seconds */; // 10 minutes
    public static unserialize(buf: SerialBuffer): Block;
    public static fromAny(block: Block | object | string): Block;
    public static fromPlain(o: object): Block;
    public serializedSize: number;
    public header: BlockHeader;
    public interlink: BlockInterlink;
    public body: BlockBody;
    public version: number;
    public prevHash: Hash;
    public interlinkHash: Hash;
    public bodyHash: Hash;
    public accountsHash: Hash;
    public nBits: number;
    public target: BigNumber;
    public difficulty: BigNumber;
    public height: number;
    public timestamp: number;
    public nonce: number;
    public minerAddr: Address | undefined;
    public transactions: Transaction[] | undefined;
    public extraData: Uint8Array | undefined;
    public prunedAccounts: PrunedAccount[] | undefined;
    public transactionCount: number | undefined;
    constructor(
        header: BlockHeader,
        interlink: BlockInterlink,
        body?: BlockBody,
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public verify(time: Time): Promise<boolean>;
    public isImmediateSuccessorOf(predecessor: Block): Promise<boolean>;
    public isInterlinkSuccessorOf(predecessor: Block): Promise<boolean>;
    public isSuccessorOf(predecessor: Block): Promise<boolean>;
    public getNextInterlink(nextTarget: BigNumber, nextVersion?: number): Promise<BlockInterlink>;
    public shallowCopy(): Block;
    public equals(o: any): boolean;
    public isLight(): boolean;
    public isFull(): boolean;
    public toLight(): Block;
    public toFull(body: BlockBody): Block;
    public hash(buf?: SerialBuffer): Hash;
    public pow(buf?: SerialBuffer): Promise<Hash>;
    public toString(): string;
    public toPlain(): {
        version: number,
        hash: string,
        prevHash: string,
        interlinkHash: string,
        bodyHash: string,
        accountsHash: string,
        nBits: number,
        difficulty: string,
        height: number,
        timestamp: number,
        nonce: number,
        interlink: string[],
        minerAddr?: string,
        transactions?: object[],
        extraData?: string,
        prunedAccounts?: object[],
    };
}

export class BlockProducer {
    constructor(blockchain: BaseChain, accounts: Accounts, mempool: Mempool, time: Time);
    public getNextBlock(address: Address, extraData?: Uint8Array): Promise<Block>;
}

export abstract class IBlockchain extends Observable {
    public abstract head: Block;
    public abstract headHash: Hash;
    public abstract height: number;
}

export abstract class BaseChain extends IBlockchain {
    public static MULTILEVEL_STRATEGY: BaseChain.MultilevelStrategy.MODERATE;
    public static MultilevelStrategy: {
        STRICT: 1;
        MODERATE: 2;
        RELAXED: 3;
    };
    public static manyPow(headers: BlockHeader[]): Promise<void>;
    constructor(store: ChainDataStore);
    public getBlock(hash: Hash, includeForks?: boolean, includeBody?: boolean): Promise<null | Block>;
    public getRawBlock(hash: Hash, includeForks?: boolean): Promise<null | Uint8Array>;
    public getBlockAt(height: number, includeBody?: boolean): Promise<null | Block>;
    public getNearestBlockAt(height: number, lower?: boolean): Promise<null | Block>;
    public getSuccessorBlocks(block: Block): Promise<Block[]>;
    public getBlockLocators(): Promise<Hash[]>;
    public getNextTarget(block?: Block, next?: Block): Promise<BigNumber>;
    public isBetterProof(proof1: ChainProof, proof2: ChainProof, m: number): Promise<boolean>;
}

export namespace BaseChain {
    type MultilevelStrategy = BaseChain.MultilevelStrategy.STRICT | BaseChain.MultilevelStrategy.MODERATE | BaseChain.MultilevelStrategy.RELAXED;
    namespace MultilevelStrategy {
        type STRICT = 1;
        type MODERATE = 2;
        type RELAXED = 3;
    }
}

export class BlockChain {
    public static merge(chain1: BlockChain, chain2: BlockChain): BlockChain;
    public static lowestCommonAncestor(chain1: BlockChain, chain2: BlockChain): undefined | Block;
    public static unserialize(buf: SerialBuffer): BlockChain;
    public serializedSize: number;
    public length: number;
    public blocks: Block[];
    public head: Block;
    public tail: Block;
    constructor(blocks: Block[], superChains?: BlockChain[]);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public verify(): Promise<boolean>;
    public denseSuffix(): Block[];
    public getSuperChains(): Promise<BlockChain[]>;
    public isAnchored(): boolean;
    public toString(): string;
    public totalDifficulty(): number;
}

export class HeaderChain {
    public static unserialize(buf: SerialBuffer): HeaderChain;
    public serializedSize: number;
    public length: number;
    public headers: BlockHeader[];
    public head: BlockHeader;
    public tail: BlockHeader;
    constructor(headers: BlockHeader[]);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public verify(): Promise<boolean>;
    public toString(): string;
    public totalDifficulty(): BigNumber;
}

export class ChainProof {
    public static unserialize(buf: SerialBuffer): ChainProof;
    public serializedSize: number;
    public prefix: BlockChain;
    public suffix: HeaderChain;
    public head: BlockHeader;
    constructor(prefix: BlockChain, suffix: HeaderChain);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public verify(): Promise<boolean>;
    public toString(): string;
}

export class ChainData {
    public static initial(block: Block, superBlockCounts: SuperBlockCounts): Promise<ChainData>;
    public static fromObj(obj: { _head: Uint8Array, _totalDifficulty: string, _totalWork: string, _superBlockCounts: number[], _onMainChain: boolean, _mainChainSuccessor: null | Uint8Array, _height: number, _pow: Uint8Array }, hashBase64?: string): ChainData;
    public head: Block;
    public totalDifficulty: BigNumber;
    public totalWork: BigNumber;
    public superBlockCounts: SuperBlockCounts;
    public onMainChain: boolean;
    public mainChainSuccessor: Hash;
    constructor(
        head: Block,
        totalDifficulty: BigNumber,
        totalWork: BigNumber,
        superBlockCounts: SuperBlockCounts,
        onMainChain?: boolean,
        mainChainSuccessor?: Hash,
    );
    public toObj(): { _head: SerialBuffer, _totalDifficulty: string, _totalWork: string, _superBlockCounts: number[], _onMainChain: boolean, _mainChainSuccessor: null | SerialBuffer, _height: number, _pow: SerialBuffer };
    public shallowCopy(): ChainData;
    public nextChainData(block: Block): Promise<ChainData>;
    public previousChainData(block: Block): Promise<ChainData>;
}

export class SuperBlockCounts {
    public length: number;
    public array: number[];
    constructor(array: number[]);
    public add(depth: number): void;
    public subtract(depth: number): void;
    public copyAndAdd(depth: number): SuperBlockCounts;
    public copyAndSubtract(depth: number): SuperBlockCounts;
    public get(depth: number): number;
    public getCandidateDepth(m: number): number;
}

export class ChainDataStore {
    public static CHAINDATA_CACHING_ENABLED: true;
    public static CHAINDATA_CACHE_SIZE: 5000;
    public static BLOCKS_CACHING_ENABLED: true;
    public static BLOCKS_CACHE_SIZE: 0;
    public static BLOCKS_RAW_CACHE_SIZE: 500;
    public static initPersistent(jdb: any): void;
    public static getPersistent(jdb: any): ChainDataStore;
    public static createVolatile(): ChainDataStore;
    public txs: any[];
    constructor(chainStore: any, blockStore: any);
    public getChainData(key: Hash, includeBody?: boolean): Promise<null | ChainData>;
    public putChainData(key: Hash, chainData: ChainData, includeBody?: boolean): Promise<void>;
    public putChainDataSync(key: Hash, chainData: ChainData, includeBody?: boolean): void;
    public removeChainDataSync(key: Hash): void;
    public getBlock(key: Hash, includeBody?: boolean): null | Block;
    public getRawBlock(key: Hash, includeForks?: boolean): Promise<null | Uint8Array>;
    public getChainDataCandidatesAt(height: number): Promise<ChainData[]>;
    public getChainDataAt(height: number, includeBody?: boolean): Promise<undefined | null | ChainData>;
    public getBlockAt(height: number, includeBody?: boolean): Promise<null | Block>;
    public getSuccessorBlocks(block: Block): Promise<Block[]>;
    public getNearestBlockAt(height: number, lower?: boolean): Promise<undefined | null | Block>;
    public getBlocks(startBlockHash: Hash, count?: number, forward?: boolean): Promise<Block[]>;
    public getBlocksForward(startBlockHash: Hash, count?: number): Promise<Block[]>;
    public getBlocksBackward(startBlockHash: Hash, count?: number, includeBody?: boolean): Promise<Block[]>;
    public getHead(): Promise<undefined | Hash>;
    public setHead(key: Hash): Promise<void>;
    public setHeadSync(key: Hash): void;
    public transaction(enableWatchdog?: boolean): ChainDataStore;
    public synchronousTransaction(enableWatchdog?: boolean): ChainDataStore;
    public commit(): Promise<void>;
    public abort(): Promise<void>;
    public snapshot(): ChainDataStore;
    public truncate(): Promise<void>;
}

export class ChainDataStoreCodec {
    public valueEncoding: { encode: (val: any) => any, decode: (val: any) => any, buffer: boolean, type: string } | void;
    public encode(obj: any): any;
    public decode(obj: any, key: string): any;
}

export class BlockStoreCodec {
    public valueEncoding: { encode: (val: any) => any, decode: (val: any) => any, buffer: boolean, type: string } | void;
    public encode(obj: any): any;
    public decode(obj: any, key: string): any;
}

export class MempoolTransactionSet {
    public transactions: Transaction[];
    public sender: Address;
    public senderType: undefined | Account.Type;
    public length: number;
    constructor(sortedTransactions: Transaction[]);
    public add(transaction: Transaction): MempoolTransactionSet;
    public remove(transaction: Transaction): MempoolTransactionSet;
    public copyAndAdd(transaction: Transaction): MempoolTransactionSet;
    public numBelowFeePerByte(feePerByte: number): number;
    public toString(): string;
}

export class MempoolFilter {
    public static BLACKLIST_SIZE: number;
    public static FEE: number;
    public static VALUE: number;
    public static TOTAL_VALUE: number;
    public static RECIPIENT_BALANCE: number;
    public static SENDER_BALANCE: number;
    public static CREATION_FEE: number;
    public static CREATION_FEE_PER_BYTE: number;
    public static CREATION_VALUE: number;
    public static CONTRACT_FEE: number;
    public static CONTRACT_FEE_PER_BYTE: number;
    public static CONTRACT_VALUE: number;
    constructor();
    public acceptsTransaction(tx: Transaction): boolean;
    public acceptsRecipientAccount(tx: Transaction, oldAccount: Account, newAccount: Account): boolean;
    public acceptsSenderAccount(tx: Transaction, oldAccount: Account, newAccount: Account): boolean;
    public blacklist(hash: Hash): void;
    public isBlacklisted(hash: Hash): boolean;
}

export class Mempool extends Observable {
    public static TRANSACTION_RELAY_FEE_MIN: 1;
    public static TRANSACTIONS_PER_SENDER_MAX: 500;
    public static FREE_TRANSACTIONS_PER_SENDER_MAX: 10;
    public static SIZE_MAX: number;
    public static ReturnCode: {
        EXPIRED: -5;
        MINED: -4;
        FILTERED: -3;
        FEE_TOO_LOW: -2;
        INVALID: -1;
        ACCEPTED: 1;
        KNOWN: 2;
    };
    public length: number;
    public queue: Synchronizer;
    constructor(blockchain: IBlockchain, accounts: Accounts);
    public pushTransaction(transaction: Transaction): Promise<Mempool.ReturnCode>;
    public getTransaction(hash: Hash): Transaction;
    // public *transactionGenerator(maxSize?: number, minFeePerByte?: number): IterableIterator<Transaction>;
    public getTransactions(maxSize?: number, minFeePerByte?: number): Transaction[];
    public getTransactionsForBlock(maxSize: number): Promise<Transaction[]>;
    public getPendingTransactions(address: Address): Transaction[];
    public getTransactionsBySender(address: Address): Transaction[];
    public getTransactionsByRecipient(address: Address): Transaction[];
    public getTransactionsByAddresses(addresses: Address[], maxTransactions?: number): Transaction[];
    public evictBelowMinFeePerByte(minFeePerByte: number): void;
    public isFiltered(txHash: Hash): boolean;
}

export namespace Mempool {
    type ReturnCode = ReturnCode.FEE_TOO_LOW | ReturnCode.INVALID | ReturnCode.ACCEPTED | ReturnCode.KNOWN;
    namespace ReturnCode {
        type EXPIRED = -5;
        type MINED = -4;
        type FILTERED = -3;
        type FEE_TOO_LOW = -2;
        type INVALID = -1;
        type ACCEPTED = 1;
        type KNOWN = 2;
    }
}

export class InvRequestManager {
    public static MAX_TIME_PER_VECTOR: 10000;
    public static MAX_INV_MANAGED: 10000;
    constructor();
    public askToRequestVector(agent: BaseConsensusAgent, vector: InvVector): void;
    public noteVectorNotReceived(agent: BaseConsensusAgent, vector: InvVector): void;
    public noteVectorReceived(vector: InvVector): void;
}

export class BaseConsensusAgent extends Observable {
    public static REQUEST_THRESHOLD: 50;
    public static REQUEST_THROTTLE: 500;
    public static REQUEST_TIMEOUT: 10000;
    public static REQUEST_TRANSACTIONS_WAITING_MAX: 5000;
    public static REQUEST_BLOCKS_WAITING_MAX: 5000;
    public static BLOCK_PROOF_REQUEST_TIMEOUT: 10000;
    public static TRANSACTIONS_PROOF_REQUEST_TIMEOUT: 10000;
    public static TRANSACTION_RECEIPTS_REQUEST_TIMEOUT: 15000;
    public static TRANSACTION_RELAY_INTERVAL: 5000;
    public static TRANSACTIONS_AT_ONCE: 100;
    public static TRANSACTIONS_PER_SECOND: 10;
    public static FREE_TRANSACTION_RELAY_INTERVAL: 6000;
    public static FREE_TRANSACTIONS_AT_ONCE: 10;
    public static FREE_TRANSACTIONS_PER_SECOND: 1;
    public static FREE_TRANSACTION_SIZE_PER_INTERVAL: 15000; // ~100 legacy transactions
    public static TRANSACTION_RELAY_FEE_MIN: 1;
    public static SUBSCRIPTION_CHANGE_GRACE_PERIOD: 3000;
    public static HEAD_REQUEST_INTERVAL: 100000; // 100 seconds, give client time to announce new head without request
    public static KNOWS_OBJECT_AFTER_INV_DELAY: 3000;
    public static KNOWN_OBJECTS_COUNT_MAX: 40000;
    public peer: Peer;
    public synced: boolean;
    public syncing: boolean;
    constructor(
        time: Time,
        peer: Peer,
        invRequestManager: InvRequestManager,
        targetSubscription?: Subscription,
    );
    public providesServices(...services: number[]): boolean;
    public onHeadUpdated(): void;
    public subscribe(subscription: Subscription): void;
    public relayBlock(block: Block): boolean;
    public requestBlock(hash: Hash): Promise<Block | null>;
    public requestTransaction(hash: Hash): Promise<Transaction | null>;
    public relayTransaction(transaction: Transaction): boolean;
    public removeTransaction(transaction: Transaction): void;
    public knowsBlock(blockHash: Hash): boolean;
    public knowsTransaction(txHash: Hash): boolean;
    public requestVector(...vector: InvVector[]): void;
    public getBlockProof(blockHashToProve: Hash, knownBlock: Block): Promise<Block>;
    public getBlockProofAt(blockHeightToProve: number, knownBlock: Block): Promise<Block>;
    public getTransactionProof(block: Block, addresses: Address[]): Promise<Transaction[]>;
    public getTransactionsProofByAddresses(block: Block, addresses: Address[]): Promise<Transaction[]>;
    public getTransactionsProofByHashes(block: Block, hashes: Hash[]): Promise<Transaction[]>;
    public getTransactionReceipts(address: Address): Promise<TransactionReceipt[]>;
    public getTransactionReceiptsByAddress(address: Address, limit?: number): Promise<TransactionReceipt[]>;
    public getTransactionReceiptsByHashes(hashes: Hash[]): Promise<TransactionReceipt[]>;
    public shutdown(): void;
}

// Not registered globally
// export class FreeTransactionVector {
//     constructor(inv: InvVector, serializedSize: number);
//     public hashCode(): string;
//     public toString(): string;
//     public inv: InvVector;
//     public serializedSize: number;
// }

export class BaseConsensus extends Observable {
    public static MAX_ATTEMPTS_TO_FETCH: 5;
    public static SYNC_THROTTLE: 1500; // ms
    public static MIN_FULL_NODES: 1;
    public static TRANSACTION_RELAY_TIMEOUT: 10000;
    public static SendTransactionResult: {
        REJECTED_LOCAL: -4,
        EXPIRED: -3,
        ALREADY_MINED: -2,
        INVALID: -1,
        NONE: 0,
        RELAYED: 1,
        KNOWN: 2,
        PENDING_LOCAL: 3,
    };
    public established: boolean;
    public network: Network;
    public invRequestManager: InvRequestManager;
    constructor(
        blockchain: BaseChain,
        mempool: Observable,
        network: Network,
    );
    public getHeadHash(): Promise<Hash>;
    public getHeadHeight(): Promise<number>;
    public getBlock(hash: Hash, includeBody?: boolean, includeBodyFromLocal?: boolean, blockHeight?: number): Promise<Block>;
    public getBlockAt(height: number, includeBody?: boolean): Promise<Block>;
    public getPendingTransactions(hashes: Hash[]): Promise<Transaction[]>;
    public getTransactionsFromBlock(hashes: Hash[], blockHash: Hash, blockHeight?: number, block?: Block): Promise<Transaction[]>;
    public getTransactionsFromBlockByAddresses(addresses: Address[], blockHash: Hash, blockHeight?: number): Promise<Transaction[]>;
    public getTransactionReceiptsByAddress(address: Address, limit?: number): Promise<TransactionReceipt[]>;
    public getTransactionReceiptsByHashes(hashes: Hash[]): Promise<TransactionReceipt[]>;
    public getMempoolContents(): Transaction[];
    public handoverTo(consensus: BaseConsensus): BaseConsensus;
    public subscribe(subscription: Subscription): void;
    public getSubscription(): Subscription;
}

export namespace BaseConsensus {
    type SendTransactionResult = SendTransactionResult.REJECTED_LOCAL | SendTransactionResult.EXPIRED | SendTransactionResult.ALREADY_MINED | SendTransactionResult.INVALID | SendTransactionResult.NONE | SendTransactionResult.RELAYED | SendTransactionResult.KNOWN | SendTransactionResult.PENDING_LOCAL;
    namespace SendTransactionResult {
        type REJECTED_LOCAL = -4;
        type EXPIRED = -3;
        type ALREADY_MINED = -2;
        type INVALID = -1;
        type NONE = 0;
        type RELAYED = 1;
        type KNOWN = 2;
        type PENDING_LOCAL = 3;
    }
}

export class FullChain extends BaseChain {
    public static ERR_ORPHAN: -2;
    public static ERR_INVALID: -1;
    public static OK_KNOWN: 0;
    public static OK_EXTENDED: 1;
    public static OK_REBRANCHED: 2;
    public static OK_FORKED: 3;
    public static SYNCHRONIZER_THROTTLE_AFTER: 500; // ms
    public static SYNCHRONIZER_THROTTLE_WAIT: 30; // ms
    public static getPersistent(jdb: any, accounts: Accounts, time: Time, transactionStore?: TransactionStore): Promise<FullChain>;
    public static createVolatile(accounts: Accounts, time: Time, transactionStore?: TransactionStore): Promise<FullChain>;
    public head: Block;
    public headHash: Hash;
    public height: number;
    public totalDifficulty: BigNumber;
    public totalWork: BigNumber;
    public accounts: Accounts;
    public transactionCache: TransactionCache;
    public blockForkedCount: number;
    public blockRebranchedCount: number;
    public blockExtendedCount: number;
    public blockOrphanCount: number;
    public blockInvalidCount: number;
    public blockKnownCount: number;
    constructor(
        store: ChainDataStore,
        accounts: Accounts,
        time: Time,
        transactionStore?: TransactionStore,
    );
    public pushBlock(block: Block): Promise<number>;
    public getBlocks(startBlockHash: Hash, count?: number, forward?: boolean): Promise<Block[]>;
    public getChainProof(): Promise<ChainProof>;
    public getBlockProof(blockToProve: Block, knownBlock: Block): Promise<null | BlockChain>;
    public getAccountsTreeChunk(blockHash: Hash, startPrefix: string): Promise<null | AccountsTreeChunk>;
    public getAccountsProof(blockHash: Hash, addresses: Address[]): Promise<null | AccountsProof>;
    public getTransactionsProof(blockHash: Hash, addresses: Address[]): Promise<null | TransactionsProof>;
    public getTransactionsProofByAddresses(blockHash: Hash, addresses: Address[]): Promise<TransactionsProof | null>;
    public getTransactionsProofByHashes(blockHash: Hash, hashes: Hash[]): Promise<TransactionsProof | null>;
    public getTransactionReceiptsByAddress(address: Address, limit?: number): Promise<TransactionReceipt[] | null>;
    public getTransactionReceiptsByHashes(hashes: Hash[], limit?: number): Promise<TransactionReceipt[] | null>;
    public getTransactionInfoByHash(transactionHash: Hash): Promise<null | TransactionStoreEntry>;
    public accountsHash(): Promise<Hash>;
    public queue(): PrioritySynchronizer;
}

export class FullConsensusAgent extends BaseConsensusAgent {
    public static SYNC_ATTEMPTS_MAX: number;
    public static GETBLOCKS_VECTORS_MAX: 500;
    public static RESYNC_THROTTLE: 3000; // 3 seconds
    public static MEMPOOL_DELAY_MIN: 2000; // 2 seconds
    public static MEMPOOL_DELAY_MAX: 20000; // 20 seconds
    public static MEMPOOL_THROTTLE: 1000;
    public static MEMPOOL_ENTRIES_MAX: 10000;
    public static CHAIN_PROOF_RATE_LIMIT: 3; // per minute
    public static ACCOUNTS_PROOF_RATE_LIMIT: 60; // per minute
    public static ACCOUNTS_TREE_CHUNK_RATE_LIMIT: 300; // per minute
    public static TRANSACTION_PROOF_RATE_LIMIT: 60; // per minute
    public static TRANSACTION_RECEIPTS_RATE_LIMIT: 30; // per minute
    public static BLOCK_PROOF_RATE_LIMIT: 60; // per minute
    public static GET_BLOCKS_RATE_LIMIT: 30; // per minute
    public syncing: boolean;
    constructor(
        blockchain: FullChain,
        mempool: Mempool,
        time: Time,
        peer: Peer,
        invRequestManager: InvRequestManager,
        targetSubscription: Subscription,
    );
    public syncBlockchain(): void;
}

export class FullConsensus extends BaseConsensus {
    public minFeePerByte: number;
    public blockchain: FullChain;
    public mempool: Mempool;
    constructor(
        blockchain: FullChain,
        mempool: Mempool,
        network: Network,
    );
    public getBlock(hash: Hash, includeBody?: boolean, includeBodyFromLocal?: boolean, blockHeight?: number): Promise<Block>;
    public getBlockAt(height: number, includeBody?: boolean): Promise<Block>;
    public getBlockTemplate(minerAddress: Address, extraData?: Uint8Array): Promise<Block>;
    public submitBlock(block: Block): Promise<boolean>;
    public getAccounts(addresses: Address[]): Promise<Account[]>;
    public getPendingTransactions(hashes: Hash[]): Promise<Transaction[]>;
    public getPendingTransactionsByAddress(address: Address, limit?: number): Promise<Transaction[]>;
    public getTransactionsFromBlock(hashes: Hash[], blockHash: Hash, blockHeight?: number, block?: Block): Promise<Transaction[]>;
    public getTransactionReceiptsByAddress(address: Address, limit?: number): Promise<TransactionReceipt[]>;
    public getTransactionReceiptsByHashes(hashes: Hash[]): Promise<TransactionReceipt[]>;
    public sendTransaction(tx: Transaction): Promise<BaseConsensus.SendTransactionResult>;
    public getMempoolContents(): Transaction[];
    public subscribeMinFeePerByte(minFeePerByte: number): void;
}

export class LightChain extends FullChain {
    public static getPersistent(jdb: any, accounts: Accounts, time: Time): Promise<LightChain>;
    public static createVolatile(accounts: Accounts, time: Time): Promise<LightChain>;
    constructor(
        store: ChainDataStore,
        accounts: Accounts,
        time: Time,
    );
    public partialChain(): PartialLightChain;
}

export class LightConsensusAgent extends FullConsensusAgent {
    public static CHAINPROOF_REQUEST_TIMEOUT: 45000;
    public static CHAINPROOF_CHUNK_TIMEOUT: 10000;
    public static ACCOUNTS_TREE_CHUNK_REQUEST_TIMEOUT: 8000;
    public static SYNC_ATTEMPTS_MAX: number;
    public static GETBLOCKS_VECTORS_MAX: 500;
    public static WEAK_PROOFS_MAX: 3;
    public syncing: boolean;
    constructor(
        blockchain: LightChain,
        mempool: Mempool,
        time: Time,
        peer: Peer,
        invRequestManager: InvRequestManager,
        targetSubscription: Subscription,
    );
    public syncBlockchain(): Promise<void>;
    public getHeader(hash: Hash): Promise<BlockHeader>;
}

export class LightConsensus extends BaseConsensus {
    public blockchain: LightChain;
    public mempool: Mempool;
    public readonly minFeePerByte: number;
    constructor(
        blockchain: LightChain,
        mempool: Mempool,
        network: Network,
    );
    public getBlockTemplate(minerAddress: Address, extraData?: Uint8Array): Promise<Block>;
    public submitBlock(block: Block): Promise<boolean>;
    public getAccounts(addresses: Address[]): Promise<Account[]>;
    public getPendingTransactions(hashes: Hash[]): Promise<Transaction[]>;
    public getPendingTransactionsByAddress(address: Address, limit?: number): Promise<Transaction[]>;
    public sendTransaction(tx: Transaction): Promise<BaseConsensus.SendTransactionResult>;
    public getMempoolContents(): Transaction[];
    public subscribeMinFeePerByte(minFeePerByte: number): void;
}

export class PartialLightChain extends LightChain {
    public static State: {
        WEAK_PROOF: -2;
        ABORTED: -1;
        PROVE_CHAIN: 0;
        PROVE_ACCOUNTS_TREE: 1;
        PROVE_BLOCKS: 2;
        COMPLETE: 3;
    };
    public state: PartialLightChain.State;
    public proofHeadHeight: number;
    constructor(
        store: ChainDataStore,
        accounts: Accounts,
        time: Time,
        proof: ChainProof,
        commitSynchronizer: PrioritySynchronizer,
    );
    public pushProof(proof: ChainProof): Promise<boolean>;
    public pushAccountsTreeChunk(chunk: AccountsTreeChunk): Promise<PartialAccountsTree.Status>;
    public commit(): Promise<boolean>;
    public abort(): Promise<void>;
    public getMissingAccountsPrefix(): string;
    // @ts-ignore
    public getBlockLocators(): Hash[];
    public numBlocksNeeded(): number;
    public needsMoreBlocks(): boolean;
}

export namespace PartialLightChain {
    type State = State.WEAK_PROOF | State.ABORTED | State.PROVE_CHAIN | State.PROVE_ACCOUNTS_TREE | State.PROVE_BLOCKS | State.COMPLETE;
    namespace State {
        type WEAK_PROOF = -2;
        type ABORTED = -1;
        type PROVE_CHAIN = 0;
        type PROVE_ACCOUNTS_TREE = 1;
        type PROVE_BLOCKS = 2;
        type COMPLETE = 3;
    }
}

export class BaseMiniConsensusAgent extends BaseConsensusAgent {
    public static ACCOUNTSPROOF_REQUEST_TIMEOUT: 5000;
    public static MEMPOOL_DELAY_MIN: 500;
    public static MEMPOOL_DELAY_MAX: 5000;
    public static MEMPOOL_ENTRIES_MAX: 1000;
    constructor(
        blockchain: BaseChain,
        mempool: NanoMempool,
        time: Time,
        peer: Peer,
        invRequestManager: InvRequestManager,
        targetSubscription: Subscription,
    );
    public requestMempool(): void;
    public getAccounts(blockHash: Hash, addresses: Address[]): Promise<Account[]>;
}

export class BaseMiniConsensus extends BaseConsensus {
    public static MempoolRejectedError: BaseMiniConsensusMempoolRejectedError;
    constructor(blockchain: BaseChain, mempool: Observable, network: Network);
    public subscribeAccounts(addresses: Address[]): void;
    public subscribe(subscription: Subscription): void;
    public addSubscriptions(newAddresses: Address[] | Address): void;
    public removeSubscriptions(addressesToRemove: Address[] | Address): void;
    public getAccount(address: Address, blockHash?: Hash): Promise<Account>;
    public getAccounts(addresses: Address[], blockHash?: Hash): Promise<Account[]>;
    public sendTransaction(tx: Transaction): Promise<BaseConsensus.SendTransactionResult>;
    public getPendingTransactions(hashes: Hash[]): Promise<Transaction[]>;
    public getPendingTransactionsByAddress(address: Address, limit?: number): Promise<Transaction[]>;
    public relayTransaction(transaction: Transaction): Promise<void>;
}

declare class BaseMiniConsensusMempoolRejectedError extends Error {
    public mempoolReturnCode: Mempool.ReturnCode;
    constructor(mempoolCode: Mempool.ReturnCode);
}

export class NanoChain extends BaseChain {
    public static ERR_ORPHAN: -2;
    public static ERR_INVALID: -1;
    public static OK_KNOWN: 0;
    public static OK_EXTENDED: 1;
    public static OK_REBRANCHED: 2;
    public static OK_FORKED: 3;
    public static SYNCHRONIZER_THROTTLE_AFTER: 500; // ms
    public static SYNCHRONIZER_THROTTLE_WAIT: 30; // ms
    public head: Block;
    public headHash: Hash;
    public height: number;
    constructor(time: Time);
    public pushProof(proof: ChainProof): Promise<boolean>;
    public pushHeader(header: BlockHeader): Promise<number>;
    public getChainProof(): Promise<ChainProof>;
}

export class NanoConsensusAgent extends BaseMiniConsensusAgent {
    public static CHAINPROOF_REQUEST_TIMEOUT: 45000;
    public static CHAINPROOF_CHUNK_TIMEOUT: 10000;
    public syncing: boolean;
    constructor(
        blockchain: NanoChain,
        mempool: NanoMempool,
        time: Time,
        peer: Peer,
        invRequestManager: InvRequestManager,
        targetSubscription: Subscription,
    );
    public syncBlockchain(): Promise<void>;
}

export class NanoConsensus extends BaseMiniConsensus {
    public blockchain: NanoChain;
    public mempool: NanoMempool;
    constructor(
        blockchain: NanoChain,
        mempool: NanoMempool,
        network: Network,
    );
}

export class NanoMempool extends Observable {
    public length: number;
    constructor(blockchain: IBlockchain);
    public pushTransaction(transaction: Transaction): Promise<Mempool.ReturnCode>;
    public getTransaction(hash: Hash): undefined | Transaction;
    public getTransactions(maxCount?: number): Transaction[];
    public getPendingTransactions(address: Address): Transaction[];
    public getTransactionsBySender(address: Address): Transaction[];
    public getTransactionsByRecipient(address: Address): Transaction[];
    public getTransactionsByAddresses(addresses: Address[], maxTransactions?: number): Transaction[];
    public changeHead(block: Block, transactions: Transaction[]): Promise<void>;
    public removeTransaction(transaction: Transaction): void;
    public evictExceptAddresses(addresses: Address[]): void;
}

export class PicoChain extends BaseChain {
    public static ERR_INCONSISTENT: -2;
    public static ERR_INVALID: -1;
    public static OK_KNOWN: 0;
    public static OK_EXTENDED: 1;
    public static OK_REBRANCHED: 2;
    public static OK_FORKED: 3;
    public head: Block;
    public headHash: Hash;
    public height: number;
    constructor(time: Time);
    public reset(): Promise<void>;
    public pushBlock(block: Block): Promise<number>;
}

export class PicoConsensusAgent extends BaseMiniConsensusAgent {
    constructor(consensus: PicoConsensus, peer: Peer, targetSubscription: Subscription);
    public syncBlockchain(): Promise<void>;
}

export class PicoConsensus extends BaseMiniConsensus {
    public static MIN_SYNCED_NODES: 3;
    public blockchain: PicoChain;
    public mempool: NanoMempool;
    constructor(blockchain: PicoChain, mempool: NanoMempool, network: Network);
}

export class ConsensusDB /* extends JDB.JungleDB */ {
    public static VERSION: number;
    public static INITIAL_DB_SIZE: number;
    public static MIN_RESIZE: number;
    public static getFull(dbPrefix?: string): Promise<ConsensusDB>;
    public static getLight(dbPrefix?: string): Promise<ConsensusDB>;
    public static restoreTransactions(jdb: ConsensusDB): Promise<void>;
    constructor(dbPrefix: string, light?: boolean);
}

// Not registered globally
// export class UpgradeHelper {
//     public static recomputeTotals(jdb: ConsensusDB): Promise<void>;
// }

export class Consensus {
    public static full(netconfig?: NetworkConfig): Promise<FullConsensus>;
    public static light(netconfig?: NetworkConfig): Promise<LightConsensus>;
    public static nano(netconfig?: NetworkConfig): Promise<NanoConsensus>;
    public static pico(netconfig?: NetworkConfig): Promise<PicoConsensus>;
    public static volatileFull(netconfig?: NetworkConfig): Promise<FullConsensus>;
    public static volatileLight(netconfig?: NetworkConfig): Promise<LightConsensus>;
    public static volatileNano(netconfig?: NetworkConfig): Promise<NanoConsensus>;
    public static volatilePico(netconfig?: NetworkConfig): Promise<PicoConsensus>;
}

export class Protocol {
    public static DUMB: 0;
    public static WSS: 1;
    public static RTC: 2;
    public static WS: 4;
}

export class Message {
    public static MAGIC: 0x42042042;
    public static Type: {
        VERSION: 0;
        INV: 1;
        GET_DATA: 2;
        GET_HEADER: 3;
        NOT_FOUND: 4;
        GET_BLOCKS: 5;
        BLOCK: 6;
        HEADER: 7;
        TX: 8;
        MEMPOOL: 9;
        REJECT: 10;
        SUBSCRIBE: 11;

        ADDR: 20;
        GET_ADDR: 21;
        PING: 22;
        PONG: 23;

        SIGNAL: 30;

        GET_CHAIN_PROOF: 40;
        CHAIN_PROOF: 41;
        GET_ACCOUNTS_PROOF: 42;
        ACCOUNTS_PROOF: 43;
        GET_ACCOUNTS_TREE_CHUNK: 44;
        ACCOUNTS_TREE_CHUNK: 45;
        GET_TRANSACTIONS_PROOF: 47;
        GET_TRANSACTIONS_PROOF_BY_ADDRESSES: 47;
        TRANSACTIONS_PROOF: 48;
        GET_TRANSACTION_RECEIPTS: 49;
        GET_TRANSACTION_RECEIPTS_BY_ADDRESS: 49;
        TRANSACTION_RECEIPTS: 50;
        GET_BLOCK_PROOF: 51;
        BLOCK_PROOF: 52;
        GET_TRANSACTIONS_PROOF_BY_HASHES: 53;
        GET_TRANSACTION_RECEIPTS_BY_HASHES: 54;
        GET_BLOCK_PROOF_AT: 55;

        GET_HEAD: 60;
        HEAD: 61;

        VERACK: 90;
    };
    public static peekType(buf: SerialBuffer): Message.Type;
    public static peekLength(buf: SerialBuffer): number;
    public static unserialize(buf: SerialBuffer): Message;
    public serializedSize: number;
    public type: Message.Type;
    constructor(type: Message.Type);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public toString(): string;
}

export namespace Message {
    type Type = Type.VERSION | Type.INV | Type.GET_DATA | Type.GET_HEADER | Type.NOT_FOUND | Type.GET_BLOCKS | Type.BLOCK | Type.HEADER | Type.TX | Type.MEMPOOL | Type.REJECT | Type.SUBSCRIBE | Type.ADDR | Type.GET_ADDR | Type.PING | Type.PONG | Type.SIGNAL | Type.GET_CHAIN_PROOF | Type.CHAIN_PROOF | Type.GET_ACCOUNTS_PROOF | Type.ACCOUNTS_PROOF | Type.GET_ACCOUNTS_TREE_CHUNK | Type.ACCOUNTS_TREE_CHUNK | Type.GET_TRANSACTIONS_PROOF | Type.GET_TRANSACTIONS_PROOF_BY_ADDRESSES | Type.TRANSACTIONS_PROOF | Type.GET_TRANSACTION_RECEIPTS | Type.GET_TRANSACTION_RECEIPTS_BY_ADDRESS | Type.TRANSACTION_RECEIPTS | Type.GET_BLOCK_PROOF | Type.BLOCK_PROOF | Type.GET_TRANSACTIONS_PROOF_BY_HASHES | Type.GET_TRANSACTION_RECEIPTS_BY_HASHES | Type.GET_BLOCK_PROOF_AT | Type.GET_HEAD | Type.HEAD | Type.VERACK;
    namespace Type {
        type VERSION = 0;
        type INV = 1;
        type GET_DATA = 2;
        type GET_HEADER = 3;
        type NOT_FOUND = 4;
        type GET_BLOCKS = 5;
        type BLOCK = 6;
        type HEADER = 7;
        type TX = 8;
        type MEMPOOL = 9;
        type REJECT = 10;
        type SUBSCRIBE = 11;

        type ADDR = 20;
        type GET_ADDR = 21;
        type PING = 22;
        type PONG = 23;

        type SIGNAL = 30;

        type GET_CHAIN_PROOF = 40;
        type CHAIN_PROOF = 41;
        type GET_ACCOUNTS_PROOF = 42;
        type ACCOUNTS_PROOF = 43;
        type GET_ACCOUNTS_TREE_CHUNK = 44;
        type ACCOUNTS_TREE_CHUNK = 45;
        type GET_TRANSACTIONS_PROOF = 47;
        type GET_TRANSACTIONS_PROOF_BY_ADDRESSES = 47;
        type TRANSACTIONS_PROOF = 48;
        type GET_TRANSACTION_RECEIPTS = 49;
        type GET_TRANSACTION_RECEIPTS_BY_ADDRESS = 49;
        type TRANSACTION_RECEIPTS = 50;
        type GET_BLOCK_PROOF = 51;
        type BLOCK_PROOF = 52;
        type GET_TRANSACTIONS_PROOF_BY_HASHES = 53;
        type GET_TRANSACTION_RECEIPTS_BY_HASHES = 54;
        type GET_BLOCK_PROOF_AT = 55;

        type GET_HEAD = 60;
        type HEAD = 61;

        type VERACK = 90;
    }
}

export class AddrMessage extends Message {
    public static ADDRESSES_MAX_COUNT: 1000;
    public static unserialize(buf: SerialBuffer): AddrMessage;
    public addresses: PeerAddress[];
    constructor(addresses: PeerAddress[]);
}

export class BlockMessage extends Message {
    public static unserialize(buf: SerialBuffer): BlockMessage;
    public block: Block;
    constructor(block: Block);
}

export class RawBlockMessage extends Message {
    public static unserialize(buf: SerialBuffer): RawBlockMessage;
    public block: Block;
    constructor(block: Uint8Array);
}

export class GetAddrMessage extends Message {
    public static unserialize(buf: SerialBuffer): GetAddrMessage;
    public protocolMask: number;
    public serviceMask: number;
    public maxResults: number;
    constructor(
        protocolMask: number,
        serviceMask: number,
        maxResults: number,
    );
}

export class GetBlocksMessage extends Message {
    public static LOCATORS_MAX_COUNT: 128;
    public static Direction: {
        FORWARD: 0x1;
        BACKWARD: 0x2;
    };
    public static unserialize(buf: SerialBuffer): GetBlocksMessage;
    public locators: Hash[];
    public direction: GetBlocksMessage.Direction;
    public maxInvSize: number;
    constructor(
        locators: Hash[],
        maxInvSize?: number,
        direction?: GetBlocksMessage.Direction,
    );
}

export namespace GetBlocksMessage {
    type Direction = Direction.FORWARD | Direction.BACKWARD;
    namespace Direction {
        type FORWARD = 0x1;
        type BACKWARD = 0x2;
    }
}

export class HeaderMessage extends Message {
    public static unserialize(buf: SerialBuffer): HeaderMessage;
    public header: BlockHeader;
    constructor(header: BlockHeader);
}

export class InvVector {
    public static Type: {
        ERROR: 0;
        TRANSACTION: 1;
        BLOCK: 2;
        unserialize(buf: SerialBuffer): InvVector.Type;
    };
    public static fromBlock(block: Block): InvVector;
    public static fromHeader(header: BlockHeader): InvVector;
    public static fromTransaction(tx: Transaction): InvVector;
    public static unserialize(buf: SerialBuffer): InvVector;
    public serializedSize: number;
    public type: InvVector.Type;
    public hash: Hash;
    constructor(type: InvVector.Type, hash: Hash);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
    public hashCode(): string;
    public toString(): string;
}

export namespace InvVector {
    type Type = Type.ERROR | Type.TRANSACTION | Type.BLOCK;
    namespace Type {
        type ERROR = 0;
        type TRANSACTION = 1;
        type BLOCK = 2;
    }
}

export class BaseInventoryMessage extends Message {
    public static VECTORS_MAX_COUNT: 1000;
    public vectors: InvVector[];
    constructor(type: Message.Type, vectors: InvVector[]);
}

export class InvMessage extends BaseInventoryMessage {
    public static unserialize(buf: SerialBuffer): InvMessage;
    constructor(vectors: InvVector[]);
}

export class GetDataMessage extends BaseInventoryMessage {
    public static unserialize(buf: SerialBuffer): GetDataMessage;
    constructor(vectors: InvVector[]);
}

export class GetHeaderMessage extends BaseInventoryMessage {
    public static unserialize(buf: SerialBuffer): GetHeaderMessage;
    constructor(vectors: InvVector[]);
}

export class NotFoundMessage extends BaseInventoryMessage {
    public static unserialize(buf: SerialBuffer): NotFoundMessage;
    constructor(vectors: InvVector[]);
}

export class MempoolMessage extends Message {
    public static unserialize(buf: SerialBuffer): MempoolMessage;
    constructor();
}

export class PingMessage extends Message {
    public static unserialize(buf: SerialBuffer): PingMessage;
    public nonce: number;
    constructor(nonce: number);
}

export class PongMessage extends Message {
    public static unserialize(buf: SerialBuffer): PongMessage;
    public nonce: number;
    constructor(nonce: number);
}

export class RejectMessage extends Message {
    public static Code: {
        REJECT_MALFORMED: 0x01;
        REJECT_INVALID: 0x10;
        REJECT_OBSOLETE: 0x11;
        REJECT_DOUBLE: 0x12;
        REJECT_DUST: 0x41;
        REJECT_INSUFFICIENT_FEE: 0x42;
    };
    public static unserialize(buf: SerialBuffer): RejectMessage;
    public messageType: Message.Type;
    public code: RejectMessage.Code;
    public reason: string;
    public extraData: Uint8Array;
    constructor(
        messageType: Message.Type,
        code: RejectMessage.Code,
        reason: string,
        extraData?: Uint8Array,
    );
}

export namespace RejectMessage {
    type Code = Code.REJECT_MALFORMED | Code.REJECT_INVALID | Code.REJECT_OBSOLETE | Code.REJECT_DOUBLE | Code.REJECT_DUST | Code.REJECT_INSUFFICIENT_FEE;
    namespace Code {
        type REJECT_MALFORMED = 0x01;
        type REJECT_INVALID = 0x10;
        type REJECT_OBSOLETE = 0x11;
        type REJECT_DOUBLE = 0x12;
        type REJECT_DUST = 0x41;
        type REJECT_INSUFFICIENT_FEE = 0x42;
    }
}

export class SignalMessage extends Message {
    public static Flag: {
        UNROUTABLE: 0x1;
        TTL_EXCEEDED: 0x2;
    };
    public static unserialize(buf: SerialBuffer): SignalMessage;
    public senderId: PeerId;
    public recipientId: PeerId;
    public nonce: number;
    public ttl: number;
    public flags: SignalMessage.Flag | number;
    public payload: Uint8Array;
    public signature: Signature;
    public senderPubKey: PublicKey;
    constructor(
        senderId: PeerId,
        recipientId: PeerId,
        nonce: number,
        ttl: number,
        flags?: SignalMessage.Flag | number,
        payload?: Uint8Array,
        senderPubKey?: PublicKey,
        signature?: Signature,
    );
    public verifySignature(): boolean;
    public hasPayload(): boolean;
    public isUnroutable(): boolean;
    public isTtlExceeded(): boolean;
}

export namespace SignalMessage {
    type Flag = Flag.UNROUTABLE | Flag.TTL_EXCEEDED;
    namespace Flag {
        type UNROUTABLE = 0x1;
        type TTL_EXCEEDED = 0x2;
    }
}

export class SubscribeMessage extends Message {
    public static unserialize(buf: SerialBuffer): SubscribeMessage;
    public subscription: Subscription;
    constructor(subscription: Subscription);
}

export class TxMessage extends Message {
    public static unserialize(buf: SerialBuffer): TxMessage;
    public transaction: Transaction;
    public hasAccountsProof: boolean;
    public accountsProof: AccountsProof;
    constructor(transaction: Transaction, accountsProof?: AccountsProof);
}

export class VersionMessage extends Message {
    public static CHALLENGE_SIZE: 32;
    public static unserialize(buf: SerialBuffer): VersionMessage;
    public version: number;
    public peerAddress: PeerAddress;
    public genesisHash: Hash;
    public headHadh: Hash;
    public challengeNonce: Uint8Array;
    public userAgent?: string;
    constructor(
        version: number,
        peerAddress: PeerAddress,
        genesisHash: Hash,
        headHash: Hash,
        challengeNonce: Uint8Array,
        userAgent?: string,
    );
}

export class VerAckMessage extends Message {
    public static unserialize(buf: SerialBuffer): VerAckMessage;
    public publicKey: PublicKey;
    public signature: Signature;
    constructor(publicKey: PublicKey, signature: Signature);
}

export class AccountsProofMessage extends Message {
    public static unserialize(buf: SerialBuffer): AccountsProofMessage;
    public blockHash: Hash;
    public proof: AccountsProof;
    constructor(blockHash: Hash, accountsProof?: AccountsProof);
    public hasProof(): boolean;
}

export class GetAccountsProofMessage extends Message {
    public static ADDRESSES_MAX_COUNT: 256;
    public static unserialize(buf: SerialBuffer): GetAccountsProofMessage;
    public addresses: Address[];
    public blockHash: Hash;
    constructor(blockHash: Hash, addresses: Address[]);
}

export class ChainProofMessage extends Message {
    public static unserialize(buf: SerialBuffer): ChainProofMessage;
    public proof: ChainProof;
    constructor(proof: ChainProof);
}

export class GetChainProofMessage extends Message {
    public static unserialize(buf: SerialBuffer): GetChainProofMessage;
    constructor();
}

export class AccountsTreeChunkMessage extends Message {
    public static unserialize(buf: SerialBuffer): AccountsTreeChunkMessage;
    public blockHash: Hash;
    public chunk: AccountsTreeChunk;
    constructor(blockHash: Hash, accountsTreeChunk?: AccountsTreeChunk);
    public hasChunk(): boolean;
}

export class GetAccountsTreeChunkMessage extends Message {
    public static unserialize(buf: SerialBuffer): GetAccountsTreeChunkMessage;
    public blockHash: Hash;
    public startPrefix: string;
    constructor(blockHash: Hash, startPrefix: string);
}

export class TransactionsProofMessage extends Message {
    public static unserialize(buf: SerialBuffer): TransactionsProofMessage;
    public blockHash: Hash;
    public proof: TransactionsProof;
    constructor(blockHash: Hash, proof?: TransactionsProof);
    public hasProof(): boolean;
}

export class GetTransactionsProofByAddressMessage extends Message {
    public static ADDRESSES_MAX_COUNT: 256;
    public static unserialize(buf: SerialBuffer): GetTransactionsProofByAddressMessage;
    public addresses: Address[];
    public blockHash: Hash;
    constructor(blockHash: Hash, addresses: Address[]);
}

export class GetTransactionReceiptsByAddressMessage extends Message {
    public static unserialize(buf: SerialBuffer): GetTransactionReceiptsByAddressMessage;
    public address: Address;
    public offset: number;
    constructor(address: Address, offset?: number);
}

export class TransactionReceiptsMessage extends Message {
    public static RECEIPTS_MAX_COUNT: 500;
    public static unserialize(buf: SerialBuffer): TransactionReceiptsMessage;
    public receipts: TransactionReceipt[];
    constructor(receipts?: TransactionReceipt[]);
    public hasReceipts(): boolean;
}

export class GetBlockProofMessage extends Message {
    public static unserialize(buf: SerialBuffer): GetBlockProofMessage;
    public blockHashToProve: Hash;
    public knownBlockHash: Hash;
    constructor(blockHashToProve: Hash, knownBlockHash: Hash);
}

export class BlockProofMessage extends Message {
    public static unserialize(buf: SerialBuffer): BlockProofMessage;
    public proof: BlockChain;
    constructor(proof?: BlockChain);
    public hasProof(): boolean;
}

export class GetHeadMessage extends Message {
    public static unserialize(buf: SerialBuffer): GetHeadMessage;
    constructor();
}

export class HeadMessage extends Message {
    public static unserialize(buf: SerialBuffer): HeadMessage;
    public header: BlockHeader;
    constructor(header: BlockHeader);
}

export class GetBlockProofAtMessage extends Message {} // TODO

export class GetTransactionReceiptsByHashesMessage extends Message {} // TODO

export class GetTransactionsProofByAddressesMessage extends Message {} // TODO

export class GetTransactionsProofByHashesMessage extends Message {} // TODO

export class MessageFactory {
    public static CLASSES: { [messageType: number]: Message };
    public static peekType(buf: SerialBuffer): Message.Type;
    public static parse(buf: SerialBuffer): Message;
}

export class WebRtcConnector extends Observable {
    public static CONNECT_TIMEOUT: 8000;
    public static CONNECTORS_MAX: 6;
    public static INBOUND_CONNECTORS_MAX: 3;
    constructor(networkConfig: NetworkConfig);
    public connect(peerAddress: PeerAddress, signalChannel: PeerChannel): boolean;
    public isValidSignal(msg: { senderId: any, nonce: any }): boolean;
    public onSignal(channel: PeerChannel, msg: SignalMessage): void;
}

export class PeerConnector extends Observable {
    public static ICE_GATHERING_TIMEOUT: 1000;
    public static CONNECTION_OPEN_DELAY: 200;
    public nonce: any;
    public peerAddress: PeerAddress;
    public rtcConnection: RTCPeerConnection;
    constructor(
        networkConfig: NetworkConfig,
        signalChannel: PeerChannel,
        peerId: PeerId,
        peerAddress: PeerAddress,
    );
    public onSignal(signal: any): void;
    public close(): void;
}

export class OutboundPeerConnector extends PeerConnector {
    constructor(
        webRtcConfig: NetworkConfig,
        peerAddress: PeerAddress,
        signalChannel: PeerChannel,
    );
    public close(): void;
}

export class InboundPeerConnector extends PeerConnector {
    constructor(webRtcConfig: NetworkConfig, signalChannel: PeerChannel, peerId: PeerId, offer: any);
}

export class WebRtcDataChannel extends DataChannel {
    public readyState: DataChannel.ReadyState;
    constructor(nativeChannel: any);
    public sendChunk(msg: any): void;
}

export class WebRtcUtils {
    public static candidateToNetAddress(candidate: RTCIceCandidate): NetAddress;
}

export class WebSocketConnector extends Observable {
    public static CONNECT_TIMEOUT: 5000;
    constructor(
        protocol: number,
        protocolPrefix: string,
        networkConfig: NetworkConfig,
    );
    public connect(peerAddress: PeerAddress): boolean;
    public abort(peerAddress: PeerAddress): void;
}

export class WebSocketDataChannel extends DataChannel {
    public readyState: DataChannel.ReadyState;
    constructor(ws: WebSocket);
    public sendChunk(msg: any): void;
}

export class NetAddress {
    public static UNSPECIFIED: NetAddress;
    public static UNKNOWN: NetAddress;
    public static Type: {
        IPv4: 0;
        IPv6: 1;
        UNSPECIFIED: 2;
        UNKNOWN: 3;
    };
    public static fromIP(ip: string, reliable?: boolean): NetAddress;
    public static unserialize(buf: SerialBuffer): NetAddress;
    public serializedSize: number;
    public ip: Uint8Array;
    public type: NetAddress.Type;
    public reliable: boolean;
    constructor(type: NetAddress.Type, ipArray?: Uint8Array, reliable?: boolean);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
    public hashCode(): string;
    public toString(): string;
    public isPseudo(): boolean;
    public isPrivate(): boolean;
    public isIPv6(): boolean;
    public isIPv4(): boolean;
    public subnet(bitCount: number): NetAddress;
}

export namespace NetAddress {
    type Type = Type.IPv4 | Type.IPv6 | Type.UNSPECIFIED | Type.UNKNOWN;
    namespace Type {
        type IPv4 = 0;
        type IPv6 = 1;
        type UNSPECIFIED = 2;
        type UNKNOWN = 3;
    }
}

export class PeerId extends Serializable {
    public static SERIALIZED_SIZE: 16;
    public static copy(o: PeerId): PeerId;
    public static unserialize(buf: SerialBuffer): PeerId;
    public static fromBase64(base64: string): PeerId;
    public static fromHex(hex: string): PeerId;
    public serializedSize: number;
    constructor(arg: Uint8Array);
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public subarray(begin?: number, end?: number): Uint8Array;
    public equals(o: any): boolean;
    public toString(): string;
}

export class PeerAddress {
    public static unserialize(buf: SerialBuffer): PeerAddress;
    public serializedSize: number;
    public serializedContentSize: number;
    public protocol: number;
    public services: number;
    public timestamp: number;
    public netAddress: NetAddress | null;
    public publicKey: PublicKey;
    public peerId: PeerId;
    public distance: number;
    public signature: Signature;
    constructor(
        protocol: number,
        services: number,
        timestamp: number,
        netAddress: NetAddress,
        publicKey: PublicKey,
        distance: number,
        signature?: Signature,
    );
    public serialize(buf?: SerialBuffer): SerialBuffer;
    public serializeContent(buf?: SerialBuffer): SerialBuffer;
    public equals(o: any): boolean;
    public hashCode(): string;
    public verifySignature(): boolean;
    public isSeed(): boolean;
    public exceedsAge(): boolean;
}

export class WsBasePeerAddress extends PeerAddress {
    public static fromSeedString(str: string): WsPeerAddress | WssPeerAddress;
    public host: string;
    public port: number;
    public protocolPrefix: string;
    constructor(
        protocol: number,
        services: number,
        timestamp: number,
        netAddress: NetAddress,
        publicKey: PublicKey,
        distance: number,
        host: string,
        port: number,
        signature?: Signature,
    );
    public toSeedString(): string;
    public globallyReachable(): boolean;
    public hashCode(): string;
    public toString(): string;
}

export class WssPeerAddress extends WsBasePeerAddress {
    public static seed(host: string, port: number, publicKeyHex?: string): WssPeerAddress;
    public static unserialize(buf: SerialBuffer): WssPeerAddress;
    constructor(
        services: number,
        timestamp: number,
        netAddress: NetAddress,
        publicKey: PublicKey,
        distance: number,
        host: string,
        port: number,
        signature?: Signature,
    );
    public withoutId(): WssPeerAddress;
}

export class WsPeerAddress extends WsBasePeerAddress {
    public static seed(host: string, port: number, publicKeyHex?: string): WsPeerAddress;
    public static unserialize(buf: SerialBuffer): WsPeerAddress;
    constructor(
        services: number,
        timestamp: number,
        netAddress: NetAddress,
        publicKey: PublicKey,
        distance: number,
        host: string,
        port: number,
        signature?: Signature,
    );
    public globallyReachable(): boolean;
    public withoutId(): WsPeerAddress;
}

export class RtcPeerAddress extends PeerAddress {
    public static unserialize(buf: SerialBuffer): RtcPeerAddress;
    constructor(
        services: number,
        timestamp: number,
        netAddress: NetAddress,
        publicKey: PublicKey,
        distance: number,
        signature?: Signature,
    );
    public hashCode(): string;
    public toString(): string;
}

export class DumbPeerAddress extends PeerAddress {
    public static unserialize(buf: SerialBuffer): DumbPeerAddress;
    constructor(
        services: number,
        timestamp: number,
        netAddress: NetAddress,
        publicKey: PublicKey,
        distance: number,
        signature?: Signature,
    );
    public hashCode(): string;
    public toString(): string;
}

export class PeerAddressState {
    public static NEW: 1;
    public static ESTABLISHED: 2;
    public static TRIED: 3;
    public static FAILED: 4;
    public static BANNED: 5;
    public signalRouter: SignalRouter;
    public maxFailedAttempts: number;
    public failedAttempts: number;
    constructor(peerAddress: PeerAddress);
    public close(type: number): void;
    public equals(o: any): boolean;
    public hashCode(): string;
    public toString(): string;
}

export class SignalRouter {
    constructor(peerAddress: PeerAddress);
    public bestRoute(): SignalRoute;
    public addRoute(signalChannel: PeerChannel, distance: number, timestamp: number): boolean;
    public deleteBestRoute(): void;
    public deleteRoute(signalChannel: PeerChannel): void;
    public deleteAllRoutes(): void;
    public hasRoute(): boolean;
    public equals(o: any): boolean;
    public hashCode(): string;
    public toString(): string;
}

export class SignalRoute {
    public signalChannel: PeerChannel;
    public distance: number;
    public score: number;
    constructor(
        signalChannel: PeerChannel,
        distance: number,
        timestamp: number,
    );
    public equals(o: any): boolean;
    public hashCode(): string;
    public toString(): string;
}

export class SeedList {
    public static MAX_SIZE: number;
    public static REQUEST_TIMEOUT: number;
    public static retrieve(url: string, publicKey?: PublicKey): Promise<SeedList>;
    public static parse(listStr: string, publicKey?: PublicKey): SeedList;
    public seeds: PeerAddress[];
    public publicKey: PublicKey;
    public signature: Signature;
    constructor(
        seeds: PeerAddress[],
        publicKey?: PublicKey,
        signature?: Signature,
    );
    public serializeContent(): Uint8Array;
}

export class SeedListUrl {
    public url: string;
    public publicKey: PublicKey;
    constructor(url: string, publicKeyHex?: string);
}

export class PeerAddressSeeder extends Observable {
    public collect(): Promise<void>;
}

export class PeerAddressBook extends Observable {
    public static MAX_AGE_WEBSOCKET: number;
    public static MAX_AGE_WEBRTC: number;
    public static MAX_AGE_DUMB: number;
    public static MAX_DISTANCE: number;
    public static MAX_FAILED_ATTEMPTS_WS: number;
    public static MAX_FAILED_ATTEMPTS_RTC: number;
    public static MAX_TIMESTAMP_DRIFT: number;
    public static HOUSEKEEPING_INTERVAL: number;
    public static DEFAULT_BAN_TIME: number;
    public static INITIAL_FAILED_BACKOFF: number;
    public static MAX_FAILED_BACKOFF: number;
    public static MAX_SIZE_WS: number;
    public static MAX_SIZE_WSS: number;
    public static MAX_SIZE_RTC: number;
    public static MAX_SIZE: number;
    public static MAX_SIZE_PER_IP: number;
    public static SEEDING_TIMEOUT: number;
    public knownAddressesCount: number;
    public knownWsAddressesCount: number;
    public knownWssAddressesCount: number;
    public knownRtcAddressesCount: number;
    public seeded: boolean;
    constructor(netconfig: NetworkConfig);
    public iterator(): Iterator<PeerAddressState>;
    public wsIterator(): Iterator<PeerAddressState>;
    public wssIterator(): Iterator<PeerAddressState>;
    public rtcIterator(): Iterator<PeerAddressState>;
    public getState(peerAddress: PeerAddress): undefined | PeerAddressState;
    public get(peerAddress: PeerAddress): null | PeerAddress;
    public getByPeerId(peerId: PeerId): null | PeerAddress;
    public getChannelByPeerId(peedId: PeerId): null | PeerChannel;
    public query(protocolMask: number, serviceMask: number, maxAddresses: number): PeerAddress[];
    public add(channel: PeerChannel, arg: PeerAddress | PeerAddress[]): void;
    public established(channel: PeerChannel, peerAddress: PeerAddress | RtcPeerAddress): void;
    public close(channel: PeerChannel, peerAddress: PeerAddress, type?: number): void;
    public unroutable(channel: PeerChannel, peerAddress: PeerAddress): void;
    public isBanned(peerAddress: PeerAddress): boolean;
}

export class GenesisConfig {
    public static NETWORK_ID: number;
    public static NETWORK_NAME: string;
    public static GENESIS_BLOCK: Block;
    public static GENESIS_HASH: Hash;
    public static GENESIS_ACCOUNTS: string;
    public static SEED_PEERS: PeerAddress[];
    public static SEED_LISTS: SeedList[];
    public static CONFIGS: { [key: string]: { NETWORK_ID: number, NETWORK_NAME: string, SEED_PEERS: PeerAddress[], SEED_LISTS: SeedListUrl, GENESIS_BLOCK: Block, GENESIS_ACCOUNTS: string } };
    public static main(): void;
    public static test(): void;
    public static dev(): void;
    public static init(config: { NETWORK_ID: number, NETWORK_NAME: string, GENESIS_BLOCK: Block, GENESIS_ACCOUNTS: string, SEED_PEERS: PeerAddress[] }): void;
    public static networkIdToNetworkName(networkId: number): string;
    public static networkIdFromAny(networkId: number | string): number;
}

export class CloseType {
    // Regular Close Types

    public static GET_BLOCKS_TIMEOUT: 1;
    public static GET_HEADER_TIMEOUT: 2;
    public static GET_CHAIN_PROOF_TIMEOUT: 3;
    public static GET_ACCOUNTS_PROOF_TIMEOUT: 4;
    public static GET_ACCOUNTS_TREE_CHUNK_TIMEOUT: 5;
    public static GET_TRANSACTIONS_PROOF_TIMEOUT: 6;
    public static GET_TRANSACTION_RECEIPTS_TIMEOUT: 7;

    public static SENDING_PING_MESSAGE_FAILED: 10;
    public static SENDING_OF_VERSION_MESSAGE_FAILED: 11;

    public static SIMULTANEOUS_CONNECTION: 20;
    public static DUPLICATE_CONNECTION: 21;
    public static INVALID_CONNECTION_STATE: 22;

    public static PEER_BANNED: 30;
    public static IP_BANNED: 31;

    public static MAX_PEER_COUNT_REACHED: 40;
    public static PEER_CONNECTION_RECYCLED: 41;
    public static PEER_CONNECTION_RECYCLED_INBOUND_EXCHANGE: 42;
    public static INBOUND_CONNECTIONS_BLOCKED: 43;

    public static MANUAL_NETWORK_DISCONNECT: 50;
    public static MANUAL_WEBSOCKET_DISCONNECT: 51;
    public static MANUAL_PEER_DISCONNECT: 52;

    // Ban Close Types

    public static INCOMPATIBLE_VERSION: 100;
    public static DIFFERENT_GENESIS_BLOCK: 101;
    public static INVALID_PEER_ADDRESS_IN_VERSION_MESSAGE: 102;
    public static UNEXPECTED_PEER_ADDRESS_IN_VERSION_MESSAGE: 103;
    public static INVALID_PUBLIC_KEY_IN_VERACK_MESSAGE: 104;
    public static INVALID_SIGNATURE_IN_VERACK_MESSAGE: 105;

    public static ADDR_MESSAGE_TOO_LARGE: 110;
    public static ADDR_NOT_GLOBALLY_REACHABLE: 111;
    public static INVALID_ADDR: 112;
    public static INVALID_SIGNAL_TTL: 113;

    public static INVALID_BLOCK: 120;
    public static INVALID_HEADER: 121;
    public static INVALID_ACCOUNTS_TREE_CHUNCK: 122;
    public static INVALID_ACCOUNTS_PROOF: 123;
    public static INVALID_CHAIN_PROOF: 124;
    public static INVALID_TRANSACTION_PROOF: 125;
    public static INVALID_BLOCK_PROOF: 126;

    public static RATE_LIMIT_EXCEEDED: 130;

    public static BLOCKCHAIN_SYNC_FAILED: 140;

    public static MANUAL_PEER_BAN: 150;

    // Fail Close Types

    public static CONNECTION_FAILED: 200;
    public static CLOSED_BY_REMOTE: 201;
    public static NETWORK_ERROR: 202;
    public static CHANNEL_CLOSING: 203;

    public static VERSION_TIMEOUT: 210;
    public static VERACK_TIMEOUT: 211;
    public static PING_TIMEOUT: 212;

    public static CONNECTION_LIMIT_PER_IP: 220;
    public static CONNECTION_LIMIT_DUMB: 221;

    public static FAILED_TO_PARSE_MESSAGE_TYPE: 230;
    public static UNEXPECTED_ACCOUNTS_TREE_CHUNK: 231;
    public static UNEXPECTED_HEADER: 232;
    public static TRANSACTION_NOT_MATCHING_SUBSCRIPTION: 233;

    public static ABORTED_SYNC: 240;

    public static MANUAL_PEER_FAIL: 250;

    public static isBanningType(closeType: number): boolean;
    public static isFailingType(closeType: number): boolean;
}

export class NetworkConnection extends Observable {
    public id: number;
    public protocol: number;
    public peerAddress: PeerAddress;
    public netAddress: NetAddress;
    public bytesSent: number;
    public bytesReceived: number;
    public inbound: boolean;
    public outbound: boolean;
    public closed: boolean;
    public lastMessageReceivedAt: number;
    constructor(
        channel: DataChannel,
        protocol: number,
        netAddress: NetAddress,
        peerAddress: PeerAddress,
    );
    public send(msg: Uint8Array): boolean;
    public expectMessage(types: Message.Type | Message.Type[], timeoutCallback: () => any, msgTimeout?: number, chunkTimeout?: number): void;
    public isExpectingMessage(type: Message.Type): boolean;
    public confirmExpectedMessage(type: Message.Type, success: boolean): void;
    public close(type?: number, reason?: string): void;
    public equals(o: any): boolean;
    public hashCode(): string;
    public toString(): string;
}

export class PeerChannel extends Observable {
    public connection: NetworkConnection;
    public id: number;
    public protocol: number;
    public peerAddress: PeerAddress;
    public netAddress: NetAddress;
    public closed: boolean;
    public lastMessageReceivedAt: number;
    public Event: { [messageType: number]: string };
    constructor(connection: NetworkConnection);
    public expectMessage(types: Message.Type | Message.Type[], timeoutCallback: () => any, msgTimeout?: number, chunkTimeout?: number): void;
    public isExpectingMessage(type: Message.Type): boolean;
    public close(type?: number, reason?: string): void;
    public version(peerAddress: PeerAddress, headHash: Hash, challengeNonce: Uint8Array, appAgent?: string): boolean;
    public verack(publicKey: PublicKey, signature: Signature): boolean;
    public inv(vectors: InvVector[]): boolean;
    public notFound(vectors: InvVector[]): boolean;
    public getData(vectors: InvVector[]): boolean;
    public getHeader(vectors: InvVector[]): boolean;
    public block(block: Block): boolean;
    public rawBlock(block: Uint8Array): boolean;
    public header(header: BlockHeader): boolean;
    public tx(transaction: Transaction, accountsProof?: AccountsProof): boolean;
    public getBlocks(locators: Hash[], maxInvSize: number, ascending?: boolean): boolean;
    public mempool(): boolean;
    public reject(messageType: Message.Type, code: RejectMessage.Code, reason: string, extraData?: Uint8Array): boolean;
    public subscribe(subscription: Subscription): boolean;
    public addr(addresses: PeerAddress[]): boolean;
    public getAddr(protocolMask: number, serviceMask: number, maxResults: number): boolean;
    public ping(nonce: number): boolean;
    public pong(nonce: number): boolean;
    public signal(senderId: PeerId, recipientId: PeerId, nonce: number, ttl: number, flags: SignalMessage.Flag | number, payload?: Uint8Array, senderPubKey?: PublicKey, signature?: Signature): boolean;
    public getAccountsProof(blockHash: Hash, addresses: Address[]): boolean;
    public accountsProof(blockHash: Hash, proof?: AccountsProof): boolean;
    public getChainProof(): boolean;
    public chainProof(proof: ChainProof): boolean;
    public getAccountsTreeChunk(blockHash: Hash, startPrefix: string): boolean;
    public accountsTreeChunk(blockHash: Hash, chunk?: AccountsTreeChunk): boolean;
    public getTransactionsProof(blockHash: Hash, addresses: Address[]): boolean;
    public getTransactionsProofByAddresses(blockHash: Hash, addresses: Address[]): boolean;
    public getTransactionsProofByHashes(blockHash: Hash, hashes: Hash[]): boolean;
    public transactionsProof(blockHash: Hash, proof?: TransactionsProof): boolean;
    public getTransactionReceipts(address: Address): boolean;
    public getTransactionReceiptsByAddress(address: Address): boolean;
    public getTransactionReceiptsByHashes(hashes: Hash[]): boolean;
    public transactionReceipts(transactionReceipts?: TransactionReceipt[]): boolean;
    public getBlockProof(blockHashToProve: Hash, knownBlockHash: Hash): boolean;
    public getBlockProofAt(blockHeightToProve: number, knownBlockHash: Hash): boolean;
    public blockProof(proof?: BlockChain): boolean;
    public getHead(): boolean;
    public head(header: BlockHeader): boolean;
    public equals(o: any): boolean;
    public hashCode(): string;
    public toString(): string;
}

export class NetworkAgent {
    public static HANDSHAKE_TIMEOUT: 4000; // 4 seconds
    public static PING_TIMEOUT: 10000; // 10 seconds
    public static CONNECTIVITY_CHECK_INTERVAL: 60000; // 1 minute
    public static ANNOUNCE_ADDR_INTERVAL: 600000; // 10 minutes
    public static VERSION_ATTEMPTS_MAX: 10;
    public static VERSION_RETRY_DELAY: 500; // 500 ms
    public static GETADDR_RATE_LIMIT: 3; // per minute
    public static MAX_ADDR_PER_MESSAGE: 1000;
    public static MAX_ADDR_PER_REQUEST: 500;
    public static NUM_ADDR_PER_REQUEST: 200;
    public channel: PeerChannel;
    public peer: Peer;
    constructor(
        blockchain: IBlockchain,
        addresses: PeerAddressBook,
        networkConfig: NetworkConfig,
        channel: PeerChannel,
    );
    public handshake(): void;
    public requestAddresses(maxResults?: number): void;
}

export class PeerConnectionStatistics {
    public latencyMedian: number;
    constructor();
    public reset(): void;
    public addLatency(latency: number): void;
    public addMessage(msg: Message): void;
    public getMessageCount(msgType: number): number;
}

export class PeerConnection {
    public static getOutbound(peerAddress: PeerAddress): PeerConnection;
    public static getInbound(networkConnection: NetworkConnection): PeerConnection;
    public id: number;
    public state: number;
    public peerAddress: PeerAddress;
    public networkConnection: NetworkConnection;
    public peerChannel: PeerChannel;
    public networkAgent: NetworkAgent;
    public peer: Peer;
    public score: number;
    public establishedSince: number;
    public ageEstablished: number;
    public statistics: PeerConnectionStatistics;
    constructor();
    public negotiating(): void;
    public close(): void;
}

export class PeerConnectionState {
    public static NEW: 1;
    public static CONNECTING: 2;
    public static CONNECTED: 3;
    public static NEGOTIATING: 4;
    public static ESTABLISHED: 5;
    public static CLOSED: 6;
}

export class SignalProcessor {
    constructor(
        peerAddress: PeerAddressBook,
        networkConfig: NetworkConfig,
        rtcConnector: WebRtcConnector,
    );
    public onSignal(channel: PeerChannel, msg: SignalMessage): void;
}

export class SignalStore {
    public static SIGNAL_MAX_AGE: 10 /* seconds */;
    public length: number;
    constructor(maxSize?: number);
    public add(senderId: PeerId, recipientId: PeerId, nonce: number): void;
    public contains(senderId: PeerId, recipientId: PeerId, nonce: number): boolean;
    public signalForwarded(senderId: PeerId, recipientId: PeerId, nonce: number): boolean;
}

export class ForwardedSignal {
    constructor(
        senderId: PeerId,
        recipientId: PeerId,
        nonce: number,
    );
    public equals(o: any): boolean;
    public hashCode(): string;
    public toString(): string;
}

export class ConnectionPool {
    public static DEFAULT_BAN_TIME: 600000;
    public static UNBAN_IPS_INTERVAL: 60000;
    public peerCountWs: number;
    public peerCountWss: number;
    public peerCountRtc: number;
    public peerCountDumb: number;
    public peerCount: number;
    public peerCountFull: number;
    public peerCountLight: number;
    public peerCountNano: number;
    public peerCountOutbound: number;
    public peerCountFullWsOutbound: number;
    public connectingCount: number;
    public count: number;
    public bytesSent: number;
    public bytesReceived: number;
    public allowInboundExchange: boolean;
    public allowInboundConnections: boolean;
    constructor(
        peerAddresses: PeerAddressBook,
        networkConfig: NetworkConfig,
        blockchain: IBlockchain,
    );
    public values(): PeerConnection[];
    public valueIterator(): Iterator<PeerConnection>;
    public getConnectionByPeerAddress(peerAddress: PeerAddress): null | PeerConnection;
    public getConnectionsByNetAddress(netAddress: NetAddress): PeerConnection[];
    public getConnectionsBySubnet(netAddress: NetAddress): PeerConnection[];
    public getOutboundConnectionsBySubnet(netAddress: NetAddress): PeerConnection[];
    public connectOutbound(peerAddress: PeerAddress): boolean;
    public disconnect(reason: string | any): void;
}

export class PeerScorer {
    public static PEER_COUNT_MIN_FULL_WS_OUTBOUND: number;
    public static PEER_COUNT_MIN_OUTBOUND: number;
    public static PICK_SELECTION_SIZE: 100;
    public static MIN_AGE_FULL: number;
    public static BEST_AGE_FULL: number;
    public static MIN_AGE_LIGHT: number;
    public static BEST_AGE_LIGHT: number;
    public static MAX_AGE_LIGHT: number;
    public static MIN_AGE_NANO: number;
    public static BEST_AGE_NANO: number;
    public static MAX_AGE_NANO: number;
    public static BEST_PROTOCOL_WS_DISTRIBUTION: 0.15; // 15%
    public lowestConnectionScore: number;
    public connectionScores: PeerConnection[];
    constructor(
        networkConfig: NetworkConfig,
        addresses: PeerAddressBook,
        connections: ConnectionPool,
    );
    public pickAddress(): null | PeerAddress;
    public isGoodPeerSet(): boolean;
    public needsGoodPeers(): boolean;
    public needsMorePeers(): boolean;
    public isGoodPeer(): boolean;
    public scoreConnections(): void;
    public recycleConnections(count: number, type: number, reason: string): void;
}

export class NetworkConfig {
    public static getDefault(): NetworkConfig;
    public protocol: number;
    public protocolMask: number;
    public keyPair: KeyPair;
    public publicKey: PublicKey;
    public peerId: PeerId;
    public services: Services;
    public peerAddress: PeerAddress;
    public appAgent: string;
    constructor(protocolMask: number);
    public initPersistent(): Promise<void>;
    public initVolatile(): Promise<void>;
    public canConnect(protocol: number): boolean;
}

export class WsNetworkConfig extends NetworkConfig {
    public protocol: number;
    public port: number;
    public reverseProxy: { enabled: boolean, port: number, addresses: string[], header: string };
    public peerAddress: WsPeerAddress | WssPeerAddress;
    public secure: boolean;
    constructor(
        host: string,
        port: number,
        reverseProxy: { enabled: boolean, port: number, addresses: string[], header: string },
    );
}

export class WssNetworkConfig extends WsNetworkConfig {
    public ssl: { key: string, cert: string };
    constructor(
        host: string,
        port: number,
        key: string,
        cert: string,
        reverseProxy: { enabled: boolean, port: number, addresses: string[], header: string },
    );
}

export class RtcNetworkConfig extends NetworkConfig {
    public rtcConfig: RTCConfiguration;
    public peerAddress: RtcPeerAddress;
    constructor();
}

export class DumbNetworkConfig extends NetworkConfig {
    public peerAddress: DumbPeerAddress;
    constructor();
}

export class Network extends Observable {
    public static PEER_COUNT_MAX: number;
    public static INBOUND_PEER_COUNT_PER_SUBNET_MAX: number;
    public static OUTBOUND_PEER_COUNT_PER_SUBNET_MAX: 2;
    public static PEER_COUNT_PER_IP_MAX: number;
    public static PEER_COUNT_DUMB_MAX: 1000;
    public static IPV4_SUBNET_MASK: 24;
    public static IPV6_SUBNET_MASK: 96;
    public static PEER_COUNT_RECYCLING_ACTIVE: number;
    public static RECYCLING_PERCENTAGE_MIN: 0.01;
    public static RECYCLING_PERCENTAGE_MAX: 0.20;
    public static CONNECTING_COUNT_MAX: 2;
    public static SIGNAL_TTL_INITIAL: 3;
    public static CONNECT_BACKOFF_INITIAL: 2000; // 2 seconds
    public static CONNECT_BACKOFF_MAX: 600000; // 10 minutes
    public static TIME_OFFSET_MAX: number; // 10 minutes
    public static HOUSEKEEPING_INTERVAL: number; // 5 minutes
    public static SCORE_INBOUND_EXCHANGE: 0.5;
    public static CONNECT_THROTTLE: 500; // 0.5 seconds
    public static ADDRESS_REQUEST_CUTOFF: 250;
    public static ADDRESS_REQUEST_PEERS: 2;
    public static SIGNALING_ENABLED: 1;
    public time: Time;
    public peerCount: number;
    public peerCountWebSocket: number;
    public peerCountWebSocketSecure: number;
    public peerCountWebRtc: number;
    public peerCountDumb: number;
    public peerCountConnecting: number;
    public knownAddressesCount: number;
    public bytesSent: number;
    public bytesReceived: number;
    public allowInboundConnections: boolean;
    public addresses: PeerAddressBook;
    public connections: ConnectionPool;
    public config: NetworkConfig;
    constructor(
        blockchain: IBlockchain,
        networkConfig: NetworkConfig,
        time: Time,
    );
    public connect(): void;
    public disconnect(reason: string | any): void;
}

export class NetUtils {
    public static IPv4_LENGTH: 4;
    public static IPv6_LENGTH: 16;
    public static IPv4_PRIVATE_NETWORK: string[];
    public static isPrivateIP(ip: string | Uint8Array): boolean;
    public static isLocalIP(ip: string | Uint8Array): boolean;
    public static isIPv4inSubnet(ip: string | Uint8Array, subnet: string): boolean;
    public static isIPv4Address(ip: string | Uint8Array): boolean;
    public static isIPv6Address(ip: string | Uint8Array): boolean;
    public static hostGloballyReachable(host: string): boolean;
    public static ipToBytes(ip: string): Uint8Array;
    public static bytesToIp(ip: Uint8Array): string;
    public static ipToSubnet(ip: string | Uint8Array, bitCount: number): string | Uint8Array;
}

export class PeerKeyStore {
    public static VERSION: number;
    public static KEY_DATABASE: string;
    public static INITIAL_DB_SIZE: number;
    public static getPersistent(): Promise<PeerKeyStore>;
    public static createVolatile(): PeerKeyStore;
    constructor(store: any);
    public get(key: string): Promise<KeyPair>;
    public put(key: string, keyPair: KeyPair): Promise<void>;
}

export class PeerKeyStoreCodec {
    public leveldbValueEncoding: string;
    public lmdbValueEncoding: object;
    public encode(obj: any): any;
    public decode(buf: any, key: string): any;
}

export class Peer {
    public channel: PeerChannel;
    public version: number;
    public headHash: Hash;
    public head: BlockHeader;
    public timeOffset: number;
    public id: number;
    public peerAddress: PeerAddress;
    public netAddress: NetAddress;
    public userAgent?: string;
    constructor(
        channel: PeerChannel,
        version: number,
        headHash: Hash,
        timeOffset: number,
        userAgent?: string,
    );
    public equals(o: any): boolean;
    public hashCode(): string;
    public toString(): string;
}

export class Miner extends Observable {
    public static MIN_TIME_ON_BLOCK: 10000;
    public static MOVING_AVERAGE_MAX_SIZE: 10;
    public address: Address;
    public working: boolean;
    public hashrate: number;
    public threads: number;
    public throttleWait: number;
    public throttleAfter: number;
    public extraData: Uint8Array;
    public shareCompact: number;
    public numBlocksMined: number;
    constructor(
        blockchain: BaseChain,
        accounts: Accounts,
        mempool: Mempool,
        time: Time,
        minerAddress: Address,
        extraData?: Uint8Array,
    );
    public startWork(): void;
    public onWorkerShare(obj: {hash: Hash, nonce: number, block: Block}): void;
    public getNextBlock(address?: Address, extraData?: Uint8Array): Promise<Block>;
    public stopWork(): void;
    public startConfigChanges(): void;
    public finishConfigChanges(): void;
}

export abstract class BasePoolMiner extends Miner {
    public static PAYOUT_NONCE_PREFIX: 'POOL_PAYOUT';
    public static RECONNECT_TIMEOUT: 3000;
    public static RECONNECT_TIMEOUT_MAX: 30000;
    public static ConnectionState: {
        CONNECTED: 0;
        CONNECTING: 1;
        CLOSED: 2;
    };
    public static Mode: {
        NANO: 'nano';
        SMART: 'smart';
    };
    public static generateDeviceId(networkConfig: NetworkConfig): number;
    public host: string;
    public port: number;
    public address: Address;
    constructor(
        mode: BasePoolMiner.Mode,
        blockchain: BaseChain,
        accounts: Accounts,
        mempool: Mempool,
        time: Time,
        address: Address,
        deviceId: number,
        deviceData: object | null,
        extraData?: Uint8Array,
    );
    public requestPayout(): void;
    public connect(host: string, port: number): void;
    public disconnect(): void;
    public isConnected(): boolean;
    public isDisconnected(): boolean;
}

export namespace BasePoolMiner {
    type ConnectionState = ConnectionState.CONNECTED | ConnectionState.CONNECTING | ConnectionState.CLOSED;
    namespace ConnectionState {
        type CONNECTED = 0;
        type CONNECTING = 1;
        type CLOSED = 2;
    }
    type Mode = Mode.NANO | Mode.SMART;
    namespace Mode {
        type NANO = 'nano';
        type SMART = 'smart';
    }
}

export class SmartPoolMiner extends BasePoolMiner {
    constructor(
        blockchain: BaseChain,
        accounts: Accounts,
        mempool: Mempool,
        time: Time,
        address: Address,
        deviceId: number,
        deviceData: object | null,
        extraData?: Uint8Array,
    );
}

export class NanoPoolMiner extends BasePoolMiner {
    constructor(
        blockchain: BaseChain,
        time: Time,
        address: Address,
        deviceId: number,
        deviceData: object | null,
    );
    // @ts-ignore
    public getNextBlock(): Block;
}

export class Wallet {
    public static generate(): Wallet;
    public static loadPlain(buf: Uint8Array | string): Wallet;
    public static loadEncrypted(buf: Uint8Array | string, key: Uint8Array | string): Promise<Wallet>;
    public isLocked: boolean;
    public address: Address;
    public publicKey: PublicKey;
    public keyPair: KeyPair;
    constructor(keyPair: KeyPair);
    public createTransaction(recipient: Address, value: number, fee: number, validityStartHeight: number): BasicTransaction;
    public signTransaction(transaction: Transaction): SignatureProof;
    public exportPlain(): Uint8Array;
    public exportEncrypted(key: Uint8Array|string): Promise<SerialBuffer>;
    public lock(key: Uint8Array | string): Promise<void>;
    public relock(): void;
    public unlock(key: Uint8Array | string): Promise<void>;
    public equals(o: any): boolean;
}

// @ts-ignore
export class MultiSigWallet extends Wallet {
    public static fromPublicKeys(keyPair: KeyPair, minSignatures: number, publicKeys: PublicKey[]): MultiSigWallet;
    public static loadPlain(buf: Uint8Array | string): MultiSigWallet;
    public static loadEncrypted(buf: Uint8Array | string, key: Uint8Array | string): Promise<MultiSigWallet>;
    public encryptedSize: number;
    public exportedSize: number;
    public minSignatures: number;
    public publicKeys: PublicKey[];
    constructor(
        keyPair: KeyPair,
        minSignatures: number,
        publicKeys: PublicKey[],
    );
    public exportEncrypted(key: Uint8Array|string): Promise<SerialBuffer>;
    public exportPlain(): Uint8Array;
    // @ts-ignore
    public createTransaction(recipientAddr: Address, value: number, fee: number, validityStartHeight: number): ExtendedTransaction;
    public createCommitment(): CommitmentPair;
    public partiallySignTransaction(transaction: Transaction, publicKeys: PublicKey[], aggregatedCommitment: Commitment, secret: RandomSecret): PartialSignature;
    // @ts-ignore
    public signTransaction(transaction: Transaction, aggregatedPublicKey: PublicKey, aggregatedCommitment: Commitment, signatures: PartialSignature[]): SignatureProof;
    public completeTransaction(transaction: Transaction, aggregatedPublicKey: PublicKey, aggregatedCommitment: Commitment, signatures: PartialSignature[]): Transaction;
}

export class WalletStore {
    public static VERSION: number;
    public static INITIAL_DB_SIZE: number; // 10 MB initially
    public static MIN_RESIZE: number; // 10 MB
    public static WALLET_DATABASE: string;
    public static MULTISIG_WALLET_DATABASE: string;
    constructor(dbName?: string);
    public hasDefault(): Promise<boolean>;
    public getDefault(key?: Uint8Array | string): Promise<Wallet>;
    public setDefault(address: Address): Promise<void>;
    public get(address: Address, key?: Uint8Array | string): Promise<null | Wallet>;
    public put(wallet: Wallet, key?: Uint8Array | string, unlockKey?: Uint8Array | string): Promise<void>;
    public remove(address: Address): Promise<void>;
    public list(): Promise<Address[]>;
    public getMultiSig(address: Address, key?: Uint8Array | string): Promise<null | MultiSigWallet>;
    public putMultiSig(wallet: MultiSigWallet, key?: Uint8Array | string, unlockKey?: Uint8Array | string): Promise<void>;
    public removeMultiSig(address: Address): Promise<void>;
    public listMultiSig(): Promise<Address[]>;
    public close(): void;
}

export class WalletStoreCodec {
    public leveldbValueEncoding: string;
    public lmdbValueEncoding: object;
    public encode(obj: any): any;
    public decode(buf: any, key: string): any;
}

export abstract class MinerWorker {
    public multiMine(blockHeader: Uint8Array, compact: number, minNonce: number, maxNonce: number): Promise<{ hash: Uint8Array, nonce: number } | boolean>;
}

export class MinerWorkerImpl extends IWorker.Stub(MinerWorker) {
    constructor();
    public init(name: string): void;
    public multiMine(input: Uint8Array, compact: number, minNonce: number, maxNonce: number): Promise<{ hash: Uint8Array, nonce: number } | boolean>;
}

export class MinerWorkerPool extends IWorker.Pool(MinerWorker) {
    public noncesPerRun: number;
    public runsPerCycle: number;
    public cycleWait: number;
    constructor(size?: number);
    public on(type: string, callback: () => any): number;
    public off(type: string, id: number): void;
    public startMiningOnBlock(block: Block, shareCompact?: number): Promise<void>;
    public stop(): void;
}
