const fs = require('fs');
const gulp = require('gulp');
const babel = require('gulp-babel');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const concat = require('gulp-concat');
const istanbul = require('istanbul-api');
const merge = require('merge2');
const minimist = require('minimist');
const replace = require('gulp-string-replace');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify-es').default;
const sriToolbox = require("sri-toolbox");

const env = minimist(process.argv.slice(2));

function sri(filename) {
    const code = fs.readFileSync(filename);
    return sriToolbox.generate({}, code);
}

const sources = {
    platform: {
        browser: [
            './src/main/platform/browser/Class.js',
            './src/main/platform/browser/utils/LogNative.js',
            './src/main/generic/utils/Log.js',
            './src/main/generic/utils/Observable.js',
            './src/main/generic/network/DataChannel.js',
            './src/main/platform/browser/crypto/CryptoLib.js',
            './src/main/platform/browser/network/webrtc/WebRtcFactory.js',
            './src/main/platform/browser/network/websocket/WebSocketFactory.js',
            './src/main/platform/browser/network/HttpRequest.js',
            './src/main/platform/browser/utils/PlatformUtils.js',
            './src/main/platform/browser/WasmHelper.js',
        ],
        offline: [
            './src/main/platform/browser/Class.js',
            './src/main/platform/browser/utils/LogNative.js',
            './src/main/generic/utils/Log.js',
            './src/main/generic/utils/Observable.js',
            './src/main/platform/browser/crypto/CryptoLib.js',
            './src/main/platform/browser/utils/PlatformUtils.js',
            './src/main/platform/browser/WasmHelper.js',
        ],
        node: [
            './src/main/platform/nodejs/utils/LogNative.js',
            './src/main/generic/utils/Log.js',
            './src/main/generic/utils/Observable.js',
            './src/main/generic/network/DataChannel.js',
            './src/main/platform/nodejs/crypto/CryptoLib.js',
            './src/main/platform/nodejs/network/webrtc/WebRtcFactory.js',
            './src/main/platform/nodejs/network/websocket/WebSocketServer.js',
            './src/main/platform/nodejs/network/websocket/WebSocketFactory.js',
            './src/main/platform/nodejs/network/HttpRequest.js',
            './src/main/platform/nodejs/utils/PlatformUtils.js',
        ]
    },
    generic: [
        './src/main/generic/utils/ConstantHelper.js',
        './src/main/generic/utils/Services.js',
        './src/main/generic/utils/Timers.js',
        './src/main/generic/utils/Version.js',
        './build/VersionNumber.js',
        './src/main/generic/utils/Time.js',
        './src/main/generic/utils/EventLoopHelper.js',
        './src/main/generic/utils/IteratorUtils.js',
        './src/main/generic/utils/array/ArrayUtils.js',
        './src/main/generic/utils/array/HashMap.js',
        './src/main/generic/utils/array/HashSet.js',
        './src/main/generic/utils/array/LimitHashSet.js',
        './src/main/generic/utils/array/InclusionHashSet.js',
        './src/main/generic/utils/array/LimitInclusionHashSet.js',
        './src/main/generic/utils/array/LimitIterable.js',
        './src/main/generic/utils/array/LinkedList.js',
        './src/main/generic/utils/array/UniqueLinkedList.js',
        './src/main/generic/utils/array/Queue.js',
        './src/main/generic/utils/array/UniqueQueue.js',
        './src/main/generic/utils/array/ThrottledQueue.js',
        './src/main/generic/utils/array/SortedList.js',
        './src/main/generic/utils/assert/Assert.js',
        './src/main/generic/utils/buffer/BufferUtils.js',
        './src/main/generic/utils/buffer/SerialBuffer.js',
        './src/main/generic/utils/synchronizer/Synchronizer.js',
        './src/main/generic/utils/synchronizer/MultiSynchronizer.js',
        './src/main/generic/utils/synchronizer/PrioritySynchronizer.js',
        './src/main/generic/utils/RateLimit.js',
        './src/main/generic/utils/IWorker.js',
        './src/main/generic/utils/crypto/CryptoWorker.js',
        './src/main/generic/utils/crypto/CryptoWorkerImpl.js',
        './src/main/generic/utils/crypto/CryptoUtils.js',
        './src/main/generic/utils/crc/CRC8.js',
        './src/main/generic/utils/crc/CRC32.js',
        './src/main/generic/utils/number/BigNumber.js',
        './src/main/generic/utils/number/NumberUtils.js',
        './src/main/generic/utils/merkle/MerkleTree.js',
        './src/main/generic/utils/merkle/MerklePath.js',
        './src/main/generic/utils/merkle/MerkleProof.js',
        './src/main/generic/utils/mnemonic/MnemonicUtils.js',
        './src/main/generic/utils/string/StringUtils.js',
        './src/main/generic/consensus/Policy.js',
        './src/main/generic/consensus/base/primitive/Serializable.js',
        './src/main/generic/consensus/base/primitive/Hash.js',
        './src/main/generic/consensus/base/primitive/Secret.js',
        './src/main/generic/consensus/base/primitive/PrivateKey.js',
        './src/main/generic/consensus/base/primitive/PublicKey.js',
        './src/main/generic/consensus/base/primitive/KeyPair.js',
        './src/main/generic/consensus/base/primitive/Entropy.js',
        './src/main/generic/consensus/base/primitive/ExtendedPrivateKey.js',
        './src/main/generic/consensus/base/primitive/RandomSecret.js',
        './src/main/generic/consensus/base/primitive/Signature.js',
        './src/main/generic/consensus/base/primitive/Commitment.js',
        './src/main/generic/consensus/base/primitive/CommitmentPair.js',
        './src/main/generic/consensus/base/primitive/PartialSignature.js',
        './src/main/generic/consensus/base/account/Address.js',
        './src/main/generic/consensus/base/account/Account.js',
        './src/main/generic/consensus/base/account/PrunedAccount.js',
        './src/main/generic/consensus/base/account/BasicAccount.js',
        './src/main/generic/consensus/base/account/Contract.js',
        './src/main/generic/consensus/base/account/HashedTimeLockedContract.js',
        './src/main/generic/consensus/base/account/VestingContract.js',
        './src/main/generic/consensus/base/account/tree/AccountsTreeNode.js',
        './src/main/generic/consensus/base/account/tree/AccountsTreeStore.js',
        './src/main/generic/consensus/base/account/tree/SynchronousAccountsTreeStore.js',
        './src/main/generic/consensus/base/account/tree/AccountsProof.js',
        './src/main/generic/consensus/base/account/tree/AccountsTreeChunk.js',
        './src/main/generic/consensus/base/account/tree/AccountsTree.js',
        './src/main/generic/consensus/base/account/tree/SynchronousAccountsTree.js',
        './src/main/generic/consensus/base/account/tree/PartialAccountsTree.js',
        './src/main/generic/consensus/base/account/Accounts.js',
        './src/main/generic/consensus/base/block/BlockHeader.js',
        './src/main/generic/consensus/base/block/BlockInterlink.js',
        './src/main/generic/consensus/base/block/BlockBody.js',
        './src/main/generic/consensus/base/block/BlockUtils.js',
        './src/main/generic/consensus/base/subscription/Subscription.js',
        './src/main/generic/consensus/base/transaction/Transaction.js',
        './src/main/generic/consensus/base/transaction/SignatureProof.js',
        './src/main/generic/consensus/base/transaction/BasicTransaction.js',
        './src/main/generic/consensus/base/transaction/ExtendedTransaction.js',
        './src/main/generic/consensus/base/transaction/TransactionsProof.js',
        './src/main/generic/consensus/base/transaction/TransactionCache.js',
        './src/main/generic/consensus/base/transaction/index/TransactionStoreEntry.js',
        './src/main/generic/consensus/base/transaction/index/TransactionStore.js',
        './src/main/generic/consensus/base/transaction/index/TransactionReceipt.js',
        './src/main/generic/consensus/base/block/Block.js',
        './src/main/generic/consensus/base/blockchain/IBlockchain.js',
        './src/main/generic/consensus/base/blockchain/BaseChain.js',
        './src/main/generic/consensus/base/blockchain/BlockChain.js',
        './src/main/generic/consensus/base/blockchain/BlockProducer.js',
        './src/main/generic/consensus/base/blockchain/HeaderChain.js',
        './src/main/generic/consensus/base/blockchain/ChainProof.js',
        './src/main/generic/consensus/base/blockchain/ChainData.js',
        './src/main/generic/consensus/base/blockchain/ChainDataStore.js',
        './src/main/generic/consensus/base/mempool/MempoolTransactionSet.js',
        './src/main/generic/consensus/base/mempool/MempoolFilter.js',
        './src/main/generic/consensus/base/mempool/Mempool.js',
        './src/main/generic/consensus/InvRequestManager.js',
        './src/main/generic/consensus/BaseConsensusAgent.js',
        './src/main/generic/consensus/BaseConsensus.js',
        './src/main/generic/consensus/BaseMiniConsensusAgent.js',
        './src/main/generic/consensus/BaseMiniConsensus.js',
        './src/main/generic/consensus/full/FullChain.js',
        './src/main/generic/consensus/full/FullConsensusAgent.js',
        './src/main/generic/consensus/full/FullConsensus.js',
        './src/main/generic/consensus/light/LightChain.js',
        './src/main/generic/consensus/light/LightConsensusAgent.js',
        './src/main/generic/consensus/light/LightConsensus.js',
        './src/main/generic/consensus/light/PartialLightChain.js',
        './src/main/generic/consensus/nano/NanoChain.js',
        './src/main/generic/consensus/nano/NanoConsensusAgent.js',
        './src/main/generic/consensus/nano/NanoConsensus.js',
        './src/main/generic/consensus/nano/NanoMempool.js',
        './src/main/generic/consensus/pico/PicoChain.js',
        './src/main/generic/consensus/pico/PicoConsensusAgent.js',
        './src/main/generic/consensus/pico/PicoConsensus.js',
        './src/main/generic/consensus/ConsensusDB.js',
        './src/main/generic/consensus/Consensus.js',
        './src/main/generic/network/Protocol.js',
        './src/main/generic/network/message/Message.js',
        './src/main/generic/network/message/AddrMessage.js',
        './src/main/generic/network/message/BlockMessage.js',
        './src/main/generic/network/message/RawBlockMessage.js',
        './src/main/generic/network/message/GetAddrMessage.js',
        './src/main/generic/network/message/GetBlocksMessage.js',
        './src/main/generic/network/message/HeaderMessage.js',
        './src/main/generic/network/message/InventoryMessage.js',
        './src/main/generic/network/message/MempoolMessage.js',
        './src/main/generic/network/message/PingMessage.js',
        './src/main/generic/network/message/PongMessage.js',
        './src/main/generic/network/message/RejectMessage.js',
        './src/main/generic/network/message/SignalMessage.js',
        './src/main/generic/network/message/SubscribeMessage.js',
        './src/main/generic/network/message/TxMessage.js',
        './src/main/generic/network/message/VersionMessage.js',
        './src/main/generic/network/message/VerAckMessage.js',
        './src/main/generic/network/message/AccountsProofMessage.js',
        './src/main/generic/network/message/GetAccountsProofMessage.js',
        './src/main/generic/network/message/ChainProofMessage.js',
        './src/main/generic/network/message/GetChainProofMessage.js',
        './src/main/generic/network/message/AccountsTreeChunkMessage.js',
        './src/main/generic/network/message/GetAccountsTreeChunkMessage.js',
        './src/main/generic/network/message/TransactionsProofMessage.js',
        './src/main/generic/network/message/GetTransactionsProofByAddressesMessage.js',
        './src/main/generic/network/message/GetTransactionsProofByHashesMessage.js',
        './src/main/generic/network/message/GetTransactionReceiptsByAddressMessage.js',
        './src/main/generic/network/message/GetTransactionReceiptsByHashesMessage.js',
        './src/main/generic/network/message/TransactionReceiptsMessage.js',
        './src/main/generic/network/message/GetBlockProofMessage.js',
        './src/main/generic/network/message/GetBlockProofAtMessage.js',
        './src/main/generic/network/message/BlockProofMessage.js',
        './src/main/generic/network/message/GetHeadMessage.js',
        './src/main/generic/network/message/HeadMessage.js',
        './src/main/generic/network/message/MessageFactory.js',
        './src/main/generic/network/webrtc/WebRtcConnector.js',
        './src/main/generic/network/webrtc/WebRtcDataChannel.js',
        './src/main/generic/network/webrtc/WebRtcUtils.js',
        './src/main/generic/network/websocket/WebSocketConnector.js',
        './src/main/generic/network/websocket/WebSocketDataChannel.js',
        './src/main/generic/network/address/NetAddress.js',
        './src/main/generic/network/address/PeerId.js',
        './src/main/generic/network/address/PeerAddress.js',
        './src/main/generic/network/address/PeerAddressState.js',
        './src/main/generic/network/address/SeedList.js',
        './src/main/generic/network/address/PeerAddressSeeder.js',
        './src/main/generic/network/address/PeerAddressBook.js',
        './src/main/generic/consensus/GenesisConfig.js',
        './src/main/generic/network/connection/CloseType.js',
        './src/main/generic/network/connection/NetworkConnection.js',
        './src/main/generic/network/connection/PeerChannel.js',
        './src/main/generic/network/connection/NetworkAgent.js',
        './src/main/generic/network/connection/PeerConnectionStatistics.js',
        './src/main/generic/network/connection/PeerConnection.js',
        './src/main/generic/network/connection/SignalProcessor.js',
        './src/main/generic/network/connection/ConnectionPool.js',
        './src/main/generic/network/PeerScorer.js',
        './src/main/generic/network/NetworkConfig.js',
        './src/main/generic/network/Network.js',
        './src/main/generic/network/NetUtils.js',
        './src/main/generic/network/PeerKeyStore.js',
        './src/main/generic/network/Peer.js',
        './src/main/generic/miner/Miner.js',
        './src/main/generic/miner/BasePoolMiner.js',
        './src/main/generic/miner/SmartPoolMiner.js',
        './src/main/generic/miner/NanoPoolMiner.js',
        './src/main/generic/wallet/Wallet.js',
        './src/main/generic/wallet/MultiSigWallet.js',
        './src/main/generic/wallet/WalletStore.js',
        './src/main/generic/miner/MinerWorker.js',
        './src/main/generic/miner/MinerWorkerImpl.js',
        './src/main/generic/miner/MinerWorkerPool.js',
        './src/main/generic/api/Client.js',
        './src/main/generic/api/Configuration.js',
        './src/main/generic/api/MempoolClient.js',
        './src/main/generic/api/NetworkClient.js',
        './src/main/generic/api/TransactionDetails.js',
    ],
    offline: [
        './src/main/generic/utils/array/ArrayUtils.js',
        './src/main/generic/utils/assert/Assert.js',
        './src/main/generic/utils/buffer/BufferUtils.js',
        './src/main/generic/utils/buffer/SerialBuffer.js',
        './src/main/generic/utils/crc/CRC8.js',
        './src/main/generic/utils/number/BigNumber.js',
        './src/main/generic/utils/number/NumberUtils.js',
        './src/main/generic/utils/merkle/MerklePath.js',
        './src/main/generic/utils/mnemonic/MnemonicUtils.js',
        './src/main/generic/utils/string/StringUtils.js',
        './src/main/generic/consensus/Policy.js',
        './src/main/generic/consensus/base/primitive/Serializable.js',
        './src/main/generic/consensus/base/primitive/Hash.js',
        './src/main/generic/consensus/base/primitive/Secret.js',
        './src/main/generic/consensus/base/primitive/PrivateKey.js',
        './src/main/generic/consensus/base/primitive/PublicKey.js',
        './src/main/generic/consensus/base/primitive/KeyPair.js',
        './src/main/generic/consensus/base/primitive/Entropy.js',
        './src/main/generic/consensus/base/primitive/ExtendedPrivateKey.js',
        './src/main/generic/consensus/base/primitive/RandomSecret.js',
        './src/main/generic/consensus/base/primitive/Signature.js',
        './src/main/generic/consensus/base/primitive/Commitment.js',
        './src/main/generic/consensus/base/primitive/CommitmentPair.js',
        './src/main/generic/consensus/base/primitive/PartialSignature.js',
        './src/main/generic/consensus/base/account/Address.js',
        './src/main/generic/consensus/base/account/Account.js',
        './src/main/generic/consensus/base/account/BasicAccount.js',
        './src/main/generic/consensus/base/account/Contract.js',
        './src/main/generic/consensus/base/account/HashedTimeLockedContract.js',
        './src/main/generic/consensus/base/account/VestingContract.js',
        './src/main/generic/consensus/base/transaction/Transaction.js',
        './src/main/generic/consensus/base/transaction/SignatureProof.js',
        './src/main/generic/consensus/base/transaction/BasicTransaction.js',
        './src/main/generic/consensus/base/transaction/ExtendedTransaction.js',
        './src/main/generic/utils/IWorker.js',
        './src/main/generic/utils/crypto/CryptoWorker.js',
        './src/main/generic/utils/crypto/CryptoUtils.js',
        './src/main/generic/consensus/GenesisConfigOffline.js'
    ],
    test: [
        'src/test/specs/**/*.spec.js'
    ],
    worker: [
        './src/main/platform/browser/Class.js',
        './src/main/platform/browser/utils/LogNative.js',
        './src/main/generic/utils/Log.js',
        './src/main/generic/utils/IWorker.js',
        './src/main/generic/utils/crypto/*.js',
        './src/main/generic/utils/number/*.js',
        './src/main/generic/utils/buffer/*.js',
        './src/main/generic/miner/MinerWorker*.js',

        './src/main/platform/browser/utils/PlatformUtils.js',
        './src/main/platform/browser/WasmHelper.js',
        './src/main/platform/browser/worker/GenesisConfig.js',
        './src/main/generic/utils/array/ArrayUtils.js',
        './src/main/generic/utils/assert/Assert.js',
        './src/main/generic/utils/buffer/SerialBuffer.js',
        './src/main/generic/utils/merkle/MerkleTree.js',
        './src/main/generic/utils/merkle/MerklePath.js',
        './src/main/generic/consensus/Policy.js',
        './src/main/generic/consensus/base/primitive/Serializable.js',
        './src/main/generic/consensus/base/primitive/Hash.js',
        './src/main/generic/consensus/base/primitive/PublicKey.js',
        './src/main/generic/consensus/base/primitive/Signature.js',
        './src/main/generic/consensus/base/account/Address.js',
        './src/main/generic/consensus/base/account/Account.js',
        './src/main/generic/consensus/base/account/PrunedAccount.js',
        './src/main/generic/consensus/base/account/BasicAccount.js',
        './src/main/generic/consensus/base/account/Contract.js',
        './src/main/generic/consensus/base/account/HashedTimeLockedContract.js',
        './src/main/generic/consensus/base/account/VestingContract.js',
        './src/main/generic/consensus/base/block/BlockHeader.js',
        './src/main/generic/consensus/base/block/BlockInterlink.js',
        './src/main/generic/consensus/base/block/BlockBody.js',
        './src/main/generic/consensus/base/block/BlockUtils.js',
        './src/main/generic/consensus/base/block/Block.js',
        './src/main/generic/consensus/base/transaction/Transaction.js',
        './src/main/generic/consensus/base/transaction/SignatureProof.js',
        './src/main/generic/consensus/base/transaction/BasicTransaction.js',
        './src/main/generic/consensus/base/transaction/ExtendedTransaction.js',
    ],
    all: [
        './src/main/**/*.js',
        '!./src/main/platform/browser/index.prefix.js',
        '!./src/main/platform/browser/index.suffix.js',
        './src/test/**/*.js',
        '!./src/**/node_modules/**/*.js'
    ]
};

const dependencies = ['./node_modules/@nimiq/jungle-db/dist/indexeddb.js']; // external dependencies

const babel_config = {
    plugins: [['@babel/plugin-transform-runtime', {
        'corejs': 2,
        'regenerator': true,
    }], '@babel/plugin-transform-modules-commonjs'],
    presets: ['@babel/preset-env']
};

const babel_loader = {
    plugins: [['@babel/plugin-transform-runtime', {
        'corejs': 2,
        'regenerator': true,
    }]],
    presets: ['@babel/preset-env']
};

const uglify_config = {
    ie8: true,
    keep_fnames: true,
    ecma: 8,
    warnings: true,
    mangle: {
        keep_classnames: true,
        safari10: true
    },
    output: {
        safari10: true
    },
    compress: {
        sequences: false,
        typeofs: false,
        keep_infinity: true
    }
};

const uglify_babel = {
    ie8: true,
    keep_fnames: true,
    ecma: 5,
    warnings: true,
    mangle: {
        keep_classnames: true,
        safari10: true
    },
    compress: {
        sequences: false,
        typeofs: false,
        keep_infinity: true
    }
};

gulp.task('create-version-file', function(cb) {
    const version = require('./package.json').version;
    if (!fs.existsSync('./build')) {
        fs.mkdirSync('/.build');
    }
    fs.writeFile('./build/VersionNumber.js', `Version.CORE_JS_VERSION = '${version}';`, cb);
});

gulp.task('build-worker', function () {
    return gulp.src(sources.worker)
        .pipe(sourcemaps.init())
        .pipe(concat('worker.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

// Build stage dependencies
const prepareNode = gulp.series('create-version-file');
const prepareWeb  = gulp.series('create-version-file', 'build-worker');
const prepareAll  = prepareWeb; // node + web

gulp.task('build-istanbul', function () {
    return new Promise((callback) => {
        istanbul.instrument.run(istanbul.config.loadObject(), {input: './src/main', output: './.istanbul/src/main'}, callback);
    });
});

const BROWSER_SOURCES = [
    ...dependencies, // external dependencies
    './src/main/platform/browser/index.prefix.js',
    ...sources.platform.browser,
    ...sources.generic,
    './src/main/platform/browser/index.suffix.js'
];

gulp.task('run-build-web-babel', function () {
    return merge(
        browserify([], {
            require: [
                '@babel/runtime-corejs2/core-js/array/from',
                '@babel/runtime-corejs2/core-js/object/values',
                '@babel/runtime-corejs2/core-js/object/freeze',
                '@babel/runtime-corejs2/core-js/object/keys',
                '@babel/runtime-corejs2/core-js/json/stringify',
                '@babel/runtime-corejs2/core-js/number/is-integer',
                '@babel/runtime-corejs2/core-js/number/max-safe-integer',
                '@babel/runtime-corejs2/core-js/math/clz32',
                '@babel/runtime-corejs2/core-js/math/fround',
                '@babel/runtime-corejs2/core-js/math/imul',
                '@babel/runtime-corejs2/core-js/math/trunc',
                '@babel/runtime-corejs2/core-js/promise',
                '@babel/runtime-corejs2/core-js/get-iterator',
                '@babel/runtime-corejs2/regenerator',
                '@babel/runtime-corejs2/helpers/asyncToGenerator'
            ]
        }).bundle()
            .pipe(source('babel.js'))
            .pipe(buffer()),
        gulp.src(BROWSER_SOURCES, {base: '.'})
            .pipe(replace('{WORKER_WASM_HASH}', sri('dist/worker-wasm.js')))
            .pipe(replace('{WORKER_JS_HASH}', sri('dist/worker-js.js')))
            .pipe(sourcemaps.init({loadMaps: true}))
            .pipe(concat('web.js'))
            .pipe(babel(babel_config)))
        .pipe(sourcemaps.init())
        .pipe(concat('web-babel.js'))
        .pipe(uglify(uglify_babel))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

gulp.task('run-build-web', function () {
    return gulp.src(BROWSER_SOURCES, {base: '.'})
        .pipe(replace('{WORKER_WASM_HASH}', sri('dist/worker-wasm.js')))
        .pipe(replace('{WORKER_JS_HASH}', sri('dist/worker-js.js')))
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(concat('web.js'))
        .pipe(uglify(uglify_config))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

const BROWSER_MODULE_SOURCES = [
    ...dependencies, // external dependencies
    './src/main/platform/browser/module.prefix.js',
    ...sources.platform.browser,
    ...sources.generic,
    './src/main/platform/browser/module.suffix.js'
];

gulp.task('run-build-web-module', function () {
    return gulp.src(BROWSER_MODULE_SOURCES, {base: '.'})
        .pipe(replace('{WORKER_WASM_HASH}', sri('dist/worker-wasm.js')))
        .pipe(replace('{WORKER_JS_HASH}', sri('dist/worker-js.js')))    
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(concat('web.esm.js'))
        .pipe(uglify(uglify_config))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

const OFFLINE_SOURCES = [
    './src/main/platform/browser/index.prefix.js',
    ...sources.platform.offline,
    ...sources.offline,
    './src/main/platform/browser/index.suffix.js'
];

gulp.task('run-build-offline-babel', function () {
    return merge(
        browserify([], {
            require: [
                '@babel/runtime-corejs2/core-js/array/from',
                '@babel/runtime-corejs2/core-js/object/values',
                '@babel/runtime-corejs2/core-js/object/freeze',
                '@babel/runtime-corejs2/core-js/object/keys',
                '@babel/runtime-corejs2/core-js/json/stringify',
                '@babel/runtime-corejs2/core-js/number/is-integer',
                '@babel/runtime-corejs2/core-js/number/max-safe-integer',
                '@babel/runtime-corejs2/core-js/math/clz32',
                '@babel/runtime-corejs2/core-js/math/fround',
                '@babel/runtime-corejs2/core-js/math/imul',
                '@babel/runtime-corejs2/core-js/math/trunc',
                '@babel/runtime-corejs2/core-js/promise',
                '@babel/runtime-corejs2/core-js/get-iterator',
                '@babel/runtime-corejs2/regenerator',
                '@babel/runtime-corejs2/helpers/asyncToGenerator'
            ]
        }).bundle()
            .pipe(source('babel.js'))
            .pipe(buffer()),
        gulp.src(OFFLINE_SOURCES, {base: '.'})
            .pipe(replace('{WORKER_WASM_HASH}', sri('dist/worker-wasm.js')))
            .pipe(replace('{WORKER_JS_HASH}', sri('dist/worker-js.js')))    
            .pipe(sourcemaps.init({loadMaps: true}))
            .pipe(concat('web-offline.js'))
            .pipe(babel(babel_config)))
        .pipe(sourcemaps.init())
        .pipe(concat('web-offline-babel.js'))
        .pipe(uglify(uglify_babel))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

gulp.task('run-build-offline', function () {
    return gulp.src(OFFLINE_SOURCES, {base: '.'})
        .pipe(replace('{WORKER_WASM_HASH}', sri('dist/worker-wasm.js')))
        .pipe(replace('{WORKER_JS_HASH}', sri('dist/worker-js.js')))    
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(concat('web-offline.js'))
        .pipe(uglify(uglify_config))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

gulp.task('run-build-web-istanbul', function () {
    return gulp.src(BROWSER_SOURCES.map(f => f.indexOf('./src/main') === 0 ? `./.istanbul/${f}` : f), {base: '.'})
        .pipe(replace('{WORKER_WASM_HASH}', sri('dist/worker-wasm.js')))
        .pipe(replace('{WORKER_JS_HASH}', sri('dist/worker-js.js')))    
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(concat('web-istanbul.js'))
        .pipe(uglify(uglify_config))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

gulp.task('build-loader', function () {
    return merge(
        browserify([], {
            require: [
                '@babel/runtime-corejs2/core-js/date/now',
                '@babel/runtime-corejs2/core-js/get-iterator',
                '@babel/runtime-corejs2/core-js/number/is-integer',
                '@babel/runtime-corejs2/core-js/number/max-safe-integer',
                '@babel/runtime-corejs2/core-js/promise',
                '@babel/runtime-corejs2/helpers/asyncToGenerator',
                '@babel/runtime-corejs2/helpers/classCallCheck',
                '@babel/runtime-corejs2/helpers/createClass',
                '@babel/runtime-corejs2/helpers/interopRequireDefault',
                '@babel/runtime-corejs2/regenerator',
            ]
        }).bundle()
            .pipe(source('babel-runtime.js'))
            .pipe(buffer())
            .pipe(sourcemaps.init()),
        gulp.src(['./src/main/platform/browser/utils/WindowDetector.js', './src/main/platform/browser/Nimiq.js'])
            .pipe(sourcemaps.init())
            .pipe(babel(babel_loader)))
        .pipe(concat('nimiq.js'))
        .pipe(uglify(uglify_config))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

const NODE_SOURCES = [
    './src/main/platform/nodejs/index.prefix.js',
    ...sources.platform.node,
    ...sources.generic,
    './src/main/platform/nodejs/index.suffix.js'
];

gulp.task('run-build-node', function () {
    return gulp.src(NODE_SOURCES)
        .pipe(sourcemaps.init())
        .pipe(concat('node.js'))
        //.pipe(uglify(uglify_config))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

gulp.task('run-build-node-istanbul', function () {
    return gulp.src(NODE_SOURCES.map(f => f.indexOf('./src/main') === 0 ? `./.istanbul/${f}` : f), {base: '.'})
        .pipe(sourcemaps.init())
        .pipe(concat('node-istanbul.js'))
        .pipe(uglify(uglify_config))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

const RELEASE_SOURCES = [
    'dist/VERSION',
    process.execPath
];

const RELEASE_LIB = [
    'dist/node.*',
    'dist/worker-*',
    'dist/web.*'
];

const RELEASE_ADDONS = [
    'build/Release/nimiq_node_compat.node',
    'build/Release/nimiq_node_sse2.node',
    'build/Release/nimiq_node_avx.node',
    'build/Release/nimiq_node_avx2.node',
    'build/Release/nimiq_node_avx512f.node'
];

gulp.task('eslint', function () {
    const eslint = require('gulp-eslint');
    return gulp.src(sources.all)
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('build-web', gulp.series(prepareWeb, 'run-build-web'));
gulp.task('build-web-babel', gulp.series(prepareWeb, 'run-build-web-babel'));
gulp.task('build-web-module', gulp.series(prepareWeb, 'run-build-web-module'));
gulp.task('build-web-istanbul', gulp.series(prepareWeb, 'build-istanbul', 'run-build-web-istanbul'));

gulp.task('build-offline', gulp.series(prepareWeb, 'run-build-offline'));
gulp.task('build-offline-babel', gulp.series(prepareWeb, 'run-build-offline-babel'));

gulp.task('build-node', gulp.series(prepareNode, 'run-build-node'));
gulp.task('build-node-istanbul', gulp.series(prepareNode, 'build-istanbul', 'run-build-node-istanbul'));

gulp.task('build', gulp.series(
    prepareAll,
    gulp.parallel(
        'build-loader',
        'run-build-web',
        'run-build-web-babel',
        'run-build-web-module',
        'run-build-offline',
        'run-build-offline-babel',
        'run-build-node',
        gulp.series(
            'build-istanbul',
            gulp.parallel(
                'run-build-web-istanbul',
                'run-build-node-istanbul',
            )
        ),
    )
));

// Build packages
gulp.task('prepare-packages', gulp.series('build-node', async function () {
    gulp.src(RELEASE_SOURCES).pipe(gulp.dest('packaging/BUILD'));
    gulp.src(['clients/nodejs/node-ui/**/*']).pipe(gulp.dest('packaging/BUILD/node-ui'));
    gulp.src(['clients/nodejs/sample.conf']).pipe(gulp.dest('packaging/BUILD/fakeroot/etc/nimiq'));
    gulp.src(['package.json']).pipe(replace('"architecture": "none"', `"architecture": "${env.architecture}"`)).pipe(gulp.dest('packaging/BUILD'));
    gulp.src(['clients/nodejs/nimiq']).pipe(replace('node "\\$SCRIPT_PATH/index.js"', '/usr/share/nimiq/{{ cli_entrypoint }}')).pipe(gulp.dest('packaging/BUILD'));
    gulp.src(['clients/nodejs/index.js', 'clients/nodejs/remote.js', 'clients/nodejs/keytool.js']).pipe(replace('../../dist/node.js', './lib/node.js')).pipe(gulp.dest('packaging/BUILD'));
    gulp.src(['clients/nodejs/modules/*.js']).pipe(replace('../../../dist/', '../lib/')).pipe(gulp.dest('packaging/BUILD/modules'));
    gulp.src(['node_modules/**/*'], {base: '.', dot: true }).pipe(gulp.dest('packaging/BUILD'));
    gulp.src(RELEASE_LIB).pipe(gulp.dest('packaging/BUILD/lib'));
    gulp.src(RELEASE_ADDONS).pipe(gulp.dest('packaging/BUILD/build'));
}));

gulp.task('default', gulp.series('build'));
