class MinerWorkerImpl extends IWorker.Stub(MinerWorker) {
    constructor() {
        super();
        // FIXME: This is needed for Babel to work correctly. Can be removed as soon as we updated to Babel v7.
        this._superInit = super.init;
    }

    async init(name) {
        await this._superInit.call(this, name);

        // FIXME: Remove when iOS 11.3 is sufficiently widespread
        let hasNoiOSBug = true;
        if(PlatformUtils.isiOS()) {
            await this.importWasm('iOS-wasm-fail.wasm', 'iOSWasmTest');
            hasNoiOSBug = await PlatformUtils.hasNoBrokenWasmImplementation();
        }

        if (hasNoiOSBug && (await this.importWasm('worker-wasm.wasm'))) {
            await this.importScript('worker-wasm.js');
        } else {
            await this.importScript('worker-js.js');
        }
    }

    async multiMine(input, compact, minNonce, maxNonce) {
        const hash = new Uint8Array(32);
        let wasmOut, wasmIn;
        try {
            wasmOut = Module._malloc(hash.length);
            wasmIn = Module._malloc(input.length);
            Module.HEAPU8.set(input, wasmIn);
            const nonce = Module._nimiq_argon2_target(wasmOut, wasmIn, input.length, compact, minNonce, maxNonce, 512);
            if (nonce === maxNonce) return false;
            hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hash.length));
            return {hash, nonce};
        } catch (e) {
            Log.w(MinerWorkerImpl, e);
            throw e;
        } finally {
            if (wasmOut !== undefined) Module._free(wasmOut);
            if (wasmIn !== undefined) Module._free(wasmIn);
        }
    }
}

IWorker.prepareForWorkerUse(MinerWorker, new MinerWorkerImpl());
