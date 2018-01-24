class SortedList {
    constructor(compare) {
        this._list = [];
        this._compare = compare || SortedList._compare;
    }

    static _compare(a, b) {
        return a.compare ? a.compare(b) : (a > b ? 1 : (a < b ? -1 : 0));
    }

    indexOf(o) {
        let a = 0, b = this._list.length - 1;
        let currentIndex = null;
        let currentElement = null;

        while (a <= b) {
            currentIndex = Math.round((a + b) / 2);
            currentElement = this._list[currentIndex];

            if (this._compare(currentElement, o) < 0) {
                a = currentIndex + 1;
            }
            else if (this._compare(currentElement, o) > 0) {
                b = currentIndex - 1;
            }
            else {
                return currentIndex;
            }
        }

        return -1;
    }

    _insertionIndex(o) {
        let a = 0, b = this._list.length - 1;
        let currentIndex = null;
        let currentElement = null;

        while (a <= b) {
            currentIndex = Math.round((a + b) / 2);
            currentElement = this._list[currentIndex];

            if (this._compare(currentElement, o) < 0) {
                a = currentIndex + 1;
            }
            else if (this._compare(currentElement, o) > 0) {
                b = currentIndex - 1;
            }
            else {
                break;
            }
        }

        return a;
    }

    add(value) {
        this._list.splice(this._insertionIndex(value), 0, value);
    }

    shift() {
        return this._list.shift();
    }

    pop() {
        return this._list.pop();
    }

    remove(value) {
        const index = this.indexOf(value);
        if (index > -1) {
            this._list.splice(index, 1);
        }
    }

    clear() {
        this._list = [];
    }

    values() {
        return this._list;
    }

    /** @type {number} */
    get length() {
        return this._list.length;
    }
}
Class.register(SortedList);
