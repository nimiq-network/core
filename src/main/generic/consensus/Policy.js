class Policy {
    /**
     * Number of Satoshis per Nimiq.
     * @type {number}
     * @constant
     */
    static get SATOSHIS_PER_COIN() {
        return 1e8;
    }

    /**
     * Targeted block time in seconds.
     * @type {number}
     * @constant
     */
    static get BLOCK_TIME() {
        return 60; // Seconds
    }

    /**
     * Miner reward per block.
     * @type {number}
     * @constant
     */
    static get BLOCK_REWARD() {
        return Policy.coinsToSatoshis(50);
    }

    /**
     * Maximum block size.
     * @type {number}
     * @constant
     */
    static get BLOCK_SIZE_MAX() {
        return 1e6; // 1 MB
    }

    /**
     * @type {number}
     * @constant
     */
    static get BLOCK_TARGET_MAX() {
        return BlockUtils.compactToTarget(0x1f00ffff); // 16 zero bits, bitcoin uses 32 (0x1d00ffff)
    }

    /**
     * Number of blocks to keep the difficulty stable.
     * @type {number}
     * @constant
     */
    static get DIFFICULTY_ADJUSTMENT_BLOCKS() {
        return 10; // Blocks
    }

    /**
     * Convert Nimiq decimal to Number of Satoshis.
     * @param {number} coins Nimiq count in decimal
     * @return {number} Number of Satoshis
     */
    static coinsToSatoshis(coins) {
        return Math.round(coins * Policy.SATOSHIS_PER_COIN);
    }

    /**
     * Convert Number of Satoshis to Nimiq decimal.
     * @param {number} satoshis Number of Satoshis.
     * @return {number} Nimiq count in decimal.
     */
    static satoshisToCoins(satoshis) {
        return satoshis / Policy.SATOSHIS_PER_COIN;
    }
}
Class.register(Policy);
