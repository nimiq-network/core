class Utils {
    static loadScript(scriptSrc) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.addEventListener('load', resolve);
            script.addEventListener('error', reject);
            setTimeout(reject, 10000);
            script.src =scriptSrc;
            document.body.appendChild(script);
        });
    }

    static getAccount($, address) {
        return Utils.awaitConsensus($)
            .then(() => $.client.getAccount(address))
            .then(account => account || Nimiq.Account.INITIAL);
    }

    static broadcastTransaction($, tx) {
        $.client.sendTransaction(tx);
    }

    static awaitConsensus($) {
        return new Promise((resolve) => {
        let handle, consensusEstablished;
            $.client.addConsensusChangedListener((state) => {
                if (state === Nimiq.Client.ConsensusState.ESTABLISHED) {
                    consensusEstablished = true;
                    $.client.removeListener(handle);
                    resolve();
                }
            }).then((x) => {
                handle = x;
                if (consensusEstablished) {
                    $.client.removeListener(handle);
                    resolve();
                }
            });
        });
    }

    static humanBytes(bytes) {
        var i = 0;
        var units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        while (bytes > 1024) {
            bytes /= 1024;
            i++;
        }
        return (Number.isInteger(bytes) ? bytes : bytes.toFixed(2)) + ' ' + units[i];
    }

    static lunasToCoins(value) {
        return Nimiq.Policy.lunasToCoins(value).toFixed(Math.log10(Nimiq.Policy.LUNAS_PER_COIN));
    }

    static satoshisToCoins(value) {
        return Utils.lunasToCoins(value);
    }

    static hash(data, algorithm) {
        switch (algorithm) {
            case Nimiq.Hash.Algorithm.BLAKE2B: return Nimiq.Hash.computeBlake2b(data);
            case Nimiq.Hash.Algorithm.SHA256: return Nimiq.Hash.computeSha256(data);
            // case Nimiq.Hash.Algorithm.ARGON2D intentionally omitted
            default: throw new Error('Invalid hash algorithm');
        }
    }

    static readAddress(input) {
        try {
            const address =  Nimiq.Address.fromUserFriendlyAddress(input.value);
            input.classList.remove('error');
            return address;
        } catch (e) {
            input.classList.add('error');
            return null;
        }
    }

    static readNumber(input) {
        const value = parseFloat(input.value);
        if (isNaN(value)) {
            input.classList.add('error');
            return null;
        } else {
            input.classList.remove('error');
            return value;
        }
    }

    static readBase64(input) {
        try {
            const buffer = Nimiq.BufferUtils.fromBase64(input.value);
            input.classList.remove('error');
            return buffer;
        } catch(e) {
            input.classList.add('error');
            return null;
        }
    }

    /** async */
    static isBasicWalletAddress($, address) {
        return $.walletStore.list()
            .then(walletAddresses => walletAddresses.some(walletAddress => address.equals(walletAddress)));
    }

    /** async */
    static isMultiSigWalletAddress($, address) {
        return $.walletStore.listMultiSig()
            .then(walletAddresses => walletAddresses.some(walletAddress => address.equals(walletAddress)));
    }
}
