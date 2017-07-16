/**
 * @template V
 */
class HashSet {
    constructor(fnHash) {
        /** @type {Map.<string,V>} */
        this._map = new Map();
        /** @type {function(object): string} */
        this._fnHash = fnHash || HashSet._hash;
    }

    /**
     * @param {{hashCode: function():string}|*} o
     * @returns {string}
     * @private
     */
    static _hash(o) {
        return o.hashCode ? o.hashCode() : o.toString();
    }

    /**
     * @param {V|*} value
     */
    add(value) {
        this._map.set(this._fnHash(value), value);
    }


    /**
     * @param {V|*} value
     * @returns {V|*}
     */
    get(value) {
        return this._map.get(this._fnHash(value));
    }

    /**
     * @param {V|*} value
     */
    remove(value) {
        this._map.delete(this._fnHash(value));
    }

    clear() {
        this._map.clear();
    }

    /**
     * @param {V|*} value
     * @returns {boolean}
     */
    contains(value) {
        return this._map.has(this._fnHash(value));
    }

    /**
     * @returns {Array.<V|*>}
     */
    values() {
        return Array.from(this._map.values());
    }

    /**
     * @returns {number}
     */
    get length() {
        return this._map.size;
    }
}
Class.register(HashSet);
