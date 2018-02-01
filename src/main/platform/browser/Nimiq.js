/**
 * Entry class and dynamic loader for the Nimiq library in Browsers.
 *
 * When using NodeJS, you don't need this class. Just require the `nimiq` library.
 *
 * @example <caption>Browser usage</caption>
 * <script type="text/javascript" src="https://cdn.nimiq.com/core/nimiq.js></script>
 * <script type="text/javascript">
 *     Nimiq.init(function(core) {
 *         console.log(core.wallet.address);
 *     }, function(errorCode) {
 *         console.log("Error initializing core.");
 *     }, options)
 * </script>
 *
 * @example <caption>Browser usage (experimental)</caption>
 * <script type="text/javascript" src="https://cdn.nimiq.com/core/nimiq.js></script>
 * <script type="text/javascript">
 *     async function init() {
 *         await Nimiq.load();
 *         const core = await new Nimiq.Core(options);
 *         console.log(core.wallet.address);
 *     }
 *     init();
 * </script>
 *
 * @example <caption>NodeJS usage</caption>
 * const Nimiq = require('nimiq');
 * const core = await new Nimiq.Core(options);
 * console.log(core.wallet.address);
 *
 * @namespace
 */
class Nimiq {
    /**
     * Load the Nimiq library.
     * @param {?string} [path] Path that contains the required files to load the library.
     * @returns {Promise} Promise that resolves once the library was loaded.
     */
    static load(path) {
        if (!Nimiq._hasNativePromise()) return Nimiq._unsupportedPromise();
        if (Nimiq._loaded) return Promise.resolve();
        Nimiq._loadPromise = Nimiq._loadPromise ||
            new Promise((resolve, error) => {
                if (!Nimiq._script) {
                    if (!Nimiq._hasNativeClassSupport() || !Nimiq._hasProperScoping()) {
                        console.error('Unsupported browser');
                        error(Nimiq.ERR_UNSUPPORTED);
                        return;
                    } else if (!Nimiq._hasAsyncAwaitSupport()) {
                        Nimiq.script = 'web-babel.js';
                        console.warn('Client lacks native support for async');
                    } else {
                        Nimiq._script = 'web.js';
                    }
                }

                if (!path) {
                    if (Nimiq._currentScript && Nimiq._currentScript.src.indexOf('/') !== -1) {
                        path = Nimiq._currentScript.src.substring(0, Nimiq._currentScript.src.lastIndexOf('/') + 1);
                    } else {
                        // Fallback
                        path = './';
                    }
                }
                
                Nimiq._path = path;
                Nimiq._fullScript = Nimiq._path + Nimiq._script;

                Nimiq._onload = () => {
                    if (!Nimiq._loaded) {
                        error(Nimiq.ERR_UNKNOWN);
                    } else {
                        resolve();
                    }
                };
                Nimiq._loadScript(Nimiq._fullScript, Nimiq._onload);
            });
        return Nimiq._loadPromise;
    }

    static _loadScript(url, resolve) {
        // Adding the script tag to the head as suggested before
        const head = document.getElementsByTagName('head')[0];
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;

        // Then bind the event to the callback function.
        // There are several events for cross browser compatibility.
        // These events might occur before processing, so delay them a bit.
        const ret = () => window.setTimeout(resolve, 1000);
        script.onreadystatechange = ret;
        script.onload = ret;

        // Fire the loading
        head.appendChild(script);
    }

    /**
     * Load classes into scope (so you don't need to prefix them with `Nimiq.`).
     * @param {Array.<string>} classes Array of class names to load in global scope
     * @returns {Promise.<void>}
     */
    static async loadToScope(...classes) {
        await Nimiq.load();
        for (const clazz of classes) {
            self[clazz] = Nimiq[clazz];
        }
    } 

    static _hasNativeClassSupport() {
        try {
            eval('"use strict"; class A{}'); // eslint-disable-line no-eval
            return true;
        } catch (err) {
            return false;
        }
    }

    static _hasAsyncAwaitSupport() {
        try {
            eval('"use strict"; (async function() { await {}; })()'); // eslint-disable-line no-eval
            return true;
        } catch (err) {
            return false;
        }
    }

    static _hasProperScoping() {
        try {
            eval('"use strict"; class a{ a() { const a = 0; } }'); // eslint-disable-line no-eval
            return true;
        } catch (err) {
            return false;
        }
    }

    static _hasNativePromise() {
        return window.Promise;
    }

    static _unsupportedPromise() {
        return {
            'catch': function (handler) {
                handler(Nimiq.ERR_UNSUPPORTED);
                return this;
            },
            'then': function () {
                return this;
            }
        };
    }

    static _hasNativeGoodies() {
        return window.Number && window.Number.isInteger;
    }

    // Required for only testing iOS WASM bug on iOS devices
    // FIXME: Remove when iOS 11.3 is sufficiently widespread
    static _isiOS() {
        return new RegExp("/iPad|iPhone|iPod/").test(navigator.userAgent) && !window.MSStream;
    }

    // Tests for a WASM implementation bug in iOS 11.2.5
    // FIXME: Remove when iOS 11.3 is sufficiently widespread
    static async _hasNoBrokenWasmImplementation() {
        // From https://github.com/brion/min-wasm-fail
        const mod = await WebAssembly.compile(iOSWasmTest.wasmBinary);
        const inst = new WebAssembly.Instance(mod, {});
        // test storing to and loading from a non-zero location via a parameter.
        if (inst.exports.test(4)) {
            // ok, we stored a value.
            return true;
        } else {
            // Safari on iOS 11.2.5 returns 0 unexpectedly at non-zero locations
            return false;
        }
    }

    /**
     * Initialize the Nimiq client library.
     * @param {function()} ready Function to be called once the library is available.
     * @param {function(errorCode: number)} error Function to be called when the initialization fails.
     */
    static init(ready, error) {
        if (!Nimiq._hasNativePromise() || !Nimiq._hasNativeGoodies()) {
            if (error) error(Nimiq.ERR_UNSUPPORTED);
            return;
        }

        // Wait until there is only a single browser window open for this origin.
        WindowDetector.get().waitForSingleWindow(async function () {
            try {
                await Nimiq.load();
                await Nimiq.Crypto.prepareSyncCryptoWorker();
                console.log('Nimiq engine loaded.');
                if (ready) ready();
            } catch (e) {
                if (Number.isInteger(e)) {
                    if (error) error(e);
                } else {
                    console.error('Error while initializing the core', e);
                    if (error) error(Nimiq.ERR_UNKNOWN);
                }
            }
        }, () => error && error(Nimiq.ERR_WAIT));
    }
}
Nimiq._currentScript = document.currentScript;
if (!Nimiq._currentScript) {
    // Heuristic
    const scripts = document.getElementsByTagName('script');
    Nimiq._currentScript = scripts[scripts.length - 1];
}

Nimiq.ERR_WAIT = -1;
Nimiq.ERR_UNSUPPORTED = -2;
Nimiq.ERR_UNKNOWN = -3;
Nimiq._script = null;
Nimiq._path = null;
Nimiq._fullScript = null;
Nimiq._onload = null;
Nimiq._loaded = false;
Nimiq._loadPromise = null;
