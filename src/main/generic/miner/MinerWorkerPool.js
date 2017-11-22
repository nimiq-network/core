/**
 *
 */
class MinerWorkerPool extends IWorker.Pool(MinerWorker) {
    constructor(size = 1) {
        super((name) => IWorker.startWorkerForProxy(MinerWorker, name), 'miner', size);
        /** @type {boolean} */
        this._miningEnabled = false;
        /** @type {Array.<{minNonce: number, maxNonce: number}>} */
        this._activeNonces = [];
        /** @type {BlockHeader} */
        this._blockHeader = null;
        /** @type {number} */
        this._noncesPerRun = 256;
        /** @type {Observable} */
        this._observable = new Observable();
        /** @type {number} */
        this._shareCompact = Policy.BLOCK_TARGET_MAX;
        /** @type {number} */
        this._runsPerCycle = Infinity;
        /** @type {number} */
        this._cycleWait = 100;

        if (PlatformUtils.isNodeJs()) {
            const nimiq_node = require(`${__dirname}/nimiq_node`);
            /**
             * @param {SerialBuffer} blockHeader
             * @param {number} compact
             * @param {number} minNonce
             * @param {number} maxNonce
             * @returns {Promise.<{hash: Uint8Array, nonce: number}|boolean>}
             */
            this.multiMine = function (blockHeader, compact, minNonce, maxNonce) {
                return new Promise((resolve, fail) => {
                    nimiq_node.nimiq_hard_hash_target_async(async (nonce) => {
                        try {
                            if (nonce === maxNonce) {
                                resolve(false);
                            } else {
                                blockHeader.writePos -= 4;
                                blockHeader.writeUint32(nonce);
                                const hash = await Crypto.hashHard(blockHeader);
                                resolve({hash, nonce});
                            }
                        } catch (e) {
                            fail(e);
                        }
                    }, blockHeader, compact, minNonce, maxNonce, 512);
                });
            };
        }
    }

    /**
     * @type {number}
     */
    get noncesPerRun() {
        return this._noncesPerRun;
    }

    /**
     * @param {number} nonces
     */
    set noncesPerRun(nonces) {
        this._noncesPerRun = nonces;
    }

    /**
     * @type {number}
     */
    get runsPerCycle() {
        return this._runsPerCycle;
    }

    /**
     * @param {number} runsPerCycle
     */
    set runsPerCycle(runsPerCycle) {
        this._runsPerCycle = runsPerCycle;
    }

    /**
     * @type {number}
     */
    get cycleWait() {
        return this._cycleWait;
    }

    /**
     * @param {number} cycleWait
     */
    set cycleWait(cycleWait) {
        this._cycleWait = cycleWait;
    }

    /**
     * @param {string} type
     * @param {Function} callback
     * @return {number}
     */
    on(type, callback) { this._observable.on(type, callback); }

    /**
     * @param {string} type
     * @param {number} id
     */
    off(type, id) { this._observable.off(type, id); }

    /**
     * @param {BlockHeader} blockHeader
     * @param {number} shareCompact target of a share, in compact format.
     */
    async startMiningOnBlock(blockHeader, shareCompact = blockHeader.nBits) {
        this._blockHeader = blockHeader;
        this._shareCompact = shareCompact;
        if (!this._miningEnabled) {
            await this._updateToSize();
            this._activeNonces = [];
            this._miningEnabled = true;
            for (let i = 0; i < this.poolSize; ++i) {
                this._startMiner();
            }
        } else {
            this._activeNonces = [{minNonce:0, maxNonce:0}];
        }
    }

    stop() {
        this._miningEnabled = false;
    }

    async _updateToSize() {
        if (!PlatformUtils.isNodeJs()) {
            await super._updateToSize();
        }

        while (this._miningEnabled && this._activeNonces.length < this.poolSize) {
            this._startMiner();
        }
    }

    _startMiner() {
        const minNonce = this._activeNonces.length === 0 ? 0 : Math.max.apply(null, this._activeNonces.map((a) => a.maxNonce));
        const maxNonce = minNonce + this._noncesPerRun;
        const nonceRange = {minNonce, maxNonce};
        this._activeNonces.push(nonceRange);
        this._singleMiner(nonceRange).catch((e) => Log.e(MinerWorkerPool, e));
    }

    /**
     * @param {{minNonce: number, maxNonce: number}} nonceRange
     * @return {Promise.<void>}
     * @private
     */
    async _singleMiner(nonceRange) {
        let i = 0;
        while (this._miningEnabled && (IWorker.areWorkersAsync || PlatformUtils.isNodeJs() || i === 0) && i < this._runsPerCycle) {
            i++;
            const blockHeader = BlockHeader.copy(this._blockHeader);
            const result = await this.multiMine(blockHeader.serialize(), this._shareCompact, nonceRange.minNonce, nonceRange.maxNonce);
            if (result) {
                const hash = new Hash(result.hash);
                this._observable.fire('share', {
                    blockHeader,
                    nonce: result.nonce,
                    hash
                });
            } else {
                this._observable.fire('no-share', {
                    nonce: nonceRange.maxNonce
                });
            }
            if (this._activeNonces.length > this.poolSize) {
                this._activeNonces.splice(this._activeNonces.indexOf(nonceRange), 1);
                return;
            } else {
                const newMin = Math.max.apply(null, this._activeNonces.map((a) => a.maxNonce));
                const newRange = {minNonce: newMin, maxNonce: newMin + this._noncesPerRun};
                this._activeNonces.splice(this._activeNonces.indexOf(nonceRange), 1, newRange);
                nonceRange = newRange;
            }
        }
        if (this._miningEnabled) {
            setTimeout(() => this._singleMiner(nonceRange), this._cycleWait);
        }
    }
}

Class.register(MinerWorkerPool);
