const gulp = require('gulp');
const babel = require('gulp-babel');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const concat = require('gulp-concat');
const connect = require('gulp-connect');
const jasmine = require('gulp-jasmine-livereload-task');
const merge = require('gulp-merge');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const util = require('gulp-util');

const sources = {
    platform: {
        browser: [
            './src/main/platform/browser/Class.js',
            './src/main/generic/utils/Observable.js',
            './src/main/platform/browser/database/BaseTypedDB.js',
            './src/main/platform/browser/database/TypedDB.js',
            './src/main/platform/browser/crypto/CryptoLib.js',
            './src/main/platform/browser/network/NetworkConfig.js',
            './src/main/platform/browser/network/webrtc/WebRtcCertificate.js',
            './src/main/platform/browser/network/webrtc/WebRtcConfig.js',
            './src/main/platform/browser/network/webrtc/WebRtcConnector.js',
            './src/main/platform/browser/network/webrtc/WebRtcUtils.js',
            './src/main/platform/browser/network/websocket/WebSocketConnector.js',
            './src/main/platform/browser/utils/WindowDetector.js',
            './src/main/platform/browser/wallet/WalletStore.js',
        ],
        node: []
    },
    generic: [
        './src/main/generic/utils/Observable.js',
        './src/main/generic/utils/Services.js',
        './src/main/generic/utils/Synchronizer.js',
        './src/main/generic/utils/Timers.js',
        './src/main/generic/utils/array/ArrayUtils.js',
        './src/main/generic/utils/array/HashMap.js',
        './src/main/generic/utils/array/HashSet.js',
        './src/main/generic/utils/array/IndexedArray.js',
        './src/main/generic/utils/buffer/BufferUtils.js',
        './src/main/generic/utils/buffer/SerialBuffer.js',
        './src/main/generic/utils/crypto/Crypto.js',
        './src/main/generic/utils/crc/CRC32.js',
        './src/main/generic/utils/database/ObjectDB.js',
        './src/main/generic/utils/database/TypedDBTransaction.js',
        './src/main/generic/utils/number/NumberUtils.js',
        './src/main/generic/utils/object/ObjectUtils.js',
        './src/main/generic/utils/platform/PlatformUtils.js',
        './src/main/generic/utils/string/StringUtils.js',
        './src/main/generic/consensus/Policy.js',
        './src/main/generic/consensus/primitive/Primitive.js',
        './src/main/generic/consensus/primitive/Hash.js',
        './src/main/generic/consensus/primitive/PrivateKey.js',
        './src/main/generic/consensus/primitive/PublicKey.js',
        './src/main/generic/consensus/primitive/Signature.js',
        './src/main/generic/consensus/account/Address.js',
        './src/main/generic/consensus/account/Accounts.js',
        './src/main/generic/consensus/account/AccountsTree.js',
        './src/main/generic/consensus/account/AccountsTreeStore.js',
        './src/main/generic/consensus/account/Balance.js',
        './src/main/generic/consensus/block/BlockHeader.js',
        './src/main/generic/consensus/block/BlockBody.js',
        './src/main/generic/consensus/block/BlockUtils.js',
        './src/main/generic/consensus/block/Block.js',
        './src/main/generic/consensus/blockchain/Blockchain.js',
        './src/main/generic/consensus/blockchain/BlockchainStore.js',
        './src/main/generic/consensus/mempool/Mempool.js',
        './src/main/generic/consensus/transaction/Transaction.js',
        './src/main/generic/consensus/ConsensusAgent.js',
        './src/main/generic/consensus/Consensus.js',
        './src/main/generic/network/Protocol.js',
        './src/main/generic/network/address/NetAddress.js',
        './src/main/generic/network/address/PeerAddress.js',
        './src/main/generic/network/address/PeerAddresses.js',
        './src/main/generic/network/message/Message.js',
        './src/main/generic/network/message/AddrMessage.js',
        './src/main/generic/network/message/BlockMessage.js',
        './src/main/generic/network/message/GetAddrMessage.js',
        './src/main/generic/network/message/GetBlocksMessage.js',
        './src/main/generic/network/message/InventoryMessage.js',
        './src/main/generic/network/message/MempoolMessage.js',
        './src/main/generic/network/message/Message.js',
        './src/main/generic/network/message/PingMessage.js',
        './src/main/generic/network/message/PongMessage.js',
        './src/main/generic/network/message/RejectMessage.js',
        './src/main/generic/network/message/SignalMessage.js',
        './src/main/generic/network/message/TxMessage.js',
        './src/main/generic/network/message/VersionMessage.js',
        './src/main/generic/network/message/MessageFactory.js',
        './src/main/generic/network/NetworkAgent.js',
        './src/main/generic/network/Network.js',
        './src/main/generic/network/PeerChannel.js',
        './src/main/generic/network/PeerConnection.js',
        './src/main/generic/network/Peer.js',
        './src/main/generic/miner/Miner.js',
        './src/main/generic/wallet/Wallet.js',
        './src/main/generic/Core.js'
    ],
    test: [
        'src/test/specs/**/*.spec.js'
    ],
    sectest: [
        'sectests/**/*.sectest.js'
    ],
    all: [
        './src/main/**/*.js',
        './src/test/**/*.js',
        '!./src/**/node_modules/**/*.js'
    ]
};

const babel_config = {
    plugins: ['transform-runtime'],
    presets: [['env', {
        targets: {
            browsers: [
                'last 3 Chrome versions',
                'last 3 Firefox versions',
                'last 2 Edge versions',
                'last 2 Safari versions',
                'last 2 iOS versions'
            ]
        }
    }]]
};

gulp.task('build-web', function () {
    merge(
        browserify([], {
            require: [
                'babel-runtime/core-js/object/freeze',
                'babel-runtime/core-js/number/is-integer',
                'babel-runtime/core-js/object/keys',
                'babel-runtime/core-js/json/stringify',
                'babel-runtime/core-js/number/max-safe-integer',
                'babel-runtime/regenerator',
                'babel-runtime/helpers/asyncToGenerator',
                'babel-runtime/core-js/promise',
                'babel-runtime/core-js/get-iterator'
            ]
        }).bundle()
            .pipe(source('babel-runtime.js'))
            .pipe(buffer()),
        gulp.src(sources.platform.browser.concat(sources.generic))
            .pipe(sourcemaps.init())
            .pipe(concat('web.js'))
            .pipe(babel(babel_config))
    ).pipe(sourcemaps.init())
        .pipe(concat('web-babel.js'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
    return gulp.src(sources.platform.browser.concat(sources.generic))
        .pipe(sourcemaps.init())
        .pipe(concat('web.js'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'))
        .pipe(connect.reload());
});

gulp.task('build-node', function () {
    return gulp.src(sources.platform.node.concat(sources.generic))
        .pipe(sourcemaps.init())
        .pipe(concat('node.js'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

gulp.task('test', ['watch'], function () {
    gulp.run(jasmine({
        files: ['dist/web.js'].concat(sources.test)
    }));
});

gulp.task('test-babel', ['watch'], function () {
    gulp.run(jasmine({
        files: ['dist/web-babel.js'].concat(sources.test)
    }));
});

gulp.task('sectest', ['watch'], function () {
    gulp.run(jasmine({
        files: ['dist/web.js'].concat(sources.sectest)
    }));
});

gulp.task('sectest-babel', ['watch'], function () {
    gulp.run(jasmine({
        files: ['dist/web.js'].concat(sources.sectest)
    }));
});

gulp.task('jscs', function () {
    const jscs = require('gulp-jscs');
    return gulp.src(sources.all)
        .pipe(jscs())
        .pipe(jscs.reporter());
});

gulp.task('eslint', function () {
    const eslint = require('gulp-eslint');
    return gulp.src(sources.all)
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('watch', ['build-web'], function () {
    return gulp.watch(sources.browser, ['build-web']);
});

gulp.task('serve', ['watch'], function () {
    connect.server({
        livereload: true,
        serverInit: function () {
            util.log(util.colors.blue('Nimiq Blockchain Cockpit will be at http://localhost:8080/clients/browser/'));
        }
    });
});

gulp.task('build', ['build-web', 'build-node']);

gulp.task('default', ['build', 'serve']);
