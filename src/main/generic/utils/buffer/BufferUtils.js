class BufferUtils {
    /**
     * @param {*} buffer
     * @return {string}
     */
    static toAscii(buffer) {
        return String.fromCharCode.apply(null, new Uint8Array(buffer));
    }

    /**
     * @param {string} string
     * @return {Uint8Array}
     */
    static fromAscii(string) {
        var buf = new Uint8Array(string.length);
        for (let i = 0; i < string.length; ++i) {
            buf[i] = string.charCodeAt(i);
        }
        return buf;
    }

    /**
     * @param {*} buffer
     * @return {string}
     */
    static toBase64(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

    /**
     * @param {string} base64
     * @return {SerialBuffer}
     */
    static fromBase64(base64) {
        return new SerialBuffer(Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
    }

    /**
     * @param {*} buffer
     * @return {string}
     */
    static toBase64Url(buffer) {
        return BufferUtils.toBase64(buffer).replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '.');
    }

    /**
     * @param {string} base64
     * @return {SerialBuffer}
     */
    static fromBase64Url(base64) {
        return new SerialBuffer(Uint8Array.from(atob(base64.replace(/_/g, '/').replace(/-/g, '+').replace(/\./g, '=')), c => c.charCodeAt(0)));
    }

    /**
     * @param {Uint8Array} buf
     * @param {string} [alphabet] Alphabet to use, defaults to base32hex (rfc 4648)
     * @return {string}
     */
    static toBase32(buf, alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUV') {
        let shift = 3, carry = 0, byte, symbol, i, res = '';

        for (i = 0; i < buf.length; i++) {
            byte = buf[i];
            symbol = carry | (byte >> shift);
            res += alphabet[symbol & 0x1f];

            if (shift > 5) {
                shift -= 5;
                symbol = byte >> shift;
                res += alphabet[symbol & 0x1f];
            }

            shift = 5 - shift;
            carry = byte << shift;
            shift = 8 - shift;
        }

        if (shift !== 3) {
            res += alphabet[carry & 0x1f];
        }

        return res;
    }

    /**
     * @param {string} base32
     * @param {string} [alphabet] Alphabet to use, defaults to base32hex (rfc 4648)
     * @return {Uint8Array}
     */
    static fromBase32(base32, alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUV') {
        const charmap = [];
        alphabet.toUpperCase().split('').forEach((c, i) => {
            if (!(c in charmap)) charmap[c] = i;
        });

        let symbol, shift = 8, carry = 0, buf = [];
        base32.toUpperCase().split('').forEach((char) => {
            // ignore padding
            if (char === '=') return;

            symbol = charmap[char] & 0xff;

            shift -= 5;
            if (shift > 0) {
                carry |= symbol << shift;
            } else if (shift < 0) {
                buf.push(carry | (symbol >> -shift));
                shift += 8;
                carry = (symbol << shift) & 0xff;
            } else {
                buf.push(carry | symbol);
                shift = 8;
                carry = 0;
            }
        });

        if (shift !== 8 && carry !== 0) {
            buf.push(carry);
        }

        return new Uint8Array(buf);
    }

    /**
     * @param {*} buffer
     * @return {string}
     */
    static toHex(buffer) {
        return Array.prototype.map.call(buffer, x => ('00' + x.toString(16)).slice(-2)).join('');
    }

    /**
     * @param {string} hex
     * @return {SerialBuffer}
     */
    static fromHex(hex) {
        if (hex.length % 2 !== 0) return null;
        return new SerialBuffer(Uint8Array.from(hex.match(/.{2}/g), byte => parseInt(byte, 16)));
    }

    /**
     * @template T
     * @param {T} a
     * @param {*} b
     * @return {T}
     */
    static concatTypedArrays(a, b) {
        const c = new (a.constructor)(a.length + b.length);
        c.set(a, 0);
        c.set(b, a.length);
        return c;
    }

    /**
     * @param {*} a
     * @param {*} b
     * @return {boolean}
     */
    static equals(a, b) {
        if (a.length !== b.length) return false;
        const viewA = new Uint8Array(a);
        const viewB = new Uint8Array(b);
        for (let i = 0; i < a.length; i++) {
            if (viewA[i] !== viewB[i]) return false;
        }
        return true;
    }
}

Class.register(BufferUtils);
