class PartialAccountsTree extends AccountsTree {
    /**
     * @private
     * @param {AccountsTreeStore} store
     */
    constructor(store) {
        super(store);
        this._complete = false;
        /** @type {string} */
        this._lastPrefix = '';
    }

    /**
     * @param {AccountsTreeChunk} chunk
     * @returns {Promise}
     */
    async pushChunk(chunk) {
        // First verify the proof.
        if (!(await chunk.verify())) {
            return PartialAccountsTree.ERR_INCORRECT_PROOF;
        }

        const tx = await this.transaction();
        // Then apply all
        await tx._putLight(chunk.terminalNodes);


        // Check if proof can be merged.
        if (!(await tx._mergeProof(chunk.proof, chunk.tail.prefix))) {
            await tx.abort();
            return PartialAccountsTree.ERR_UNMERGEABLE;
        }
        this._complete = tx.complete;

        // Now, we can put all nodes into the store.
        await tx.commit();

        // Update last prefix.
        this._lastPrefix = chunk.tail.prefix;

        // And return OK code depending on internal state.
        return this._complete ? PartialAccountsTree.OK_COMPLETE : PartialAccountsTree.OK_UNFINISHED;
    }

    /**
     * @param {AccountsProof} proof
     * @param {string} upperBound
     * @returns {Promise.<boolean>}
     * @private
     */
    async _mergeProof(proof, upperBound) {
        // Retrieve rightmost path of the in-memory tree.
        let node = await this._store.getRootNode();
        let nodeChildren = node.getChildren();
        let complete = true;

        // Iterate over the proof and check for consistency.
        let j = proof.length - 1;
        for (; j > 0; --j) {
            const proofNode = proof.nodes[j];
            // The node's prefix might be shorter than the proof node's prefix if it is a newly
            // introduces node in the proof.
            if (StringUtils.commonPrefix(node.prefix, proofNode.prefix) !== node.prefix) {
                return false;
            }

            const proofChildren = proofNode.getChildren();

            // The tree node may not have more children than the proof node.
            if (nodeChildren.length > proofChildren.length) {
                return false;
            }

            // The nextChild we descend to.
            const nextChild = node.getLastChild();
            let insertedNode = false;

            // There are three cases:
            // 1) the child is in our inner tree (so between lower and upper bound), then the hashes must coincide.
            // 2) the child is left of our chunk, so it must be in the store.
            // 3) the child is right of our chunk, so it is a dangling reference.
            let i = 0;
            for (const proofChild of proofChildren) {
                const upperBoundPrefix = upperBound.substr(0, proofChild.length);
                if (proofChild <= upperBoundPrefix) {
                    // An inner node.
                    const child = nodeChildren.shift();

                    // This is the next child.
                    if (StringUtils.commonPrefix(nextChild, proofChild) === proofChild) {
                        // If it is a real prefix of the next child, we have inserted a new node.
                        if (proofChild !== nextChild) {
                            insertedNode = true;
                        }
                        continue;
                    }

                    if (child !== proofChild) {
                        return false;
                    }
                    // The child is equal and not the next child, so the hash must coincide.
                    const nodeHash = node.getChildHash(child);
                    const proofHash = proofNode.getChildHash(child);
                    if (!nodeHash || !proofHash || !nodeHash.equals(proofHash)) {
                        return false;
                    }
                } else {
                    // The others may be dangling references.
                    break;
                }
                ++i;
            }

            // We must have consumed all children!
            if (nodeChildren.length !== 0) {
                return false;
            }

            // If not all of the proof children have been tested, we are definitely incomplete.
            complete = complete && (i === proofChildren.length - 1);

            // If the prefix was the same, we can move on.
            if (insertedNode) {
                nodeChildren = [nextChild];
            } else {
                // We should never end here with a terminal node.
                if (node.isTerminal()) {
                    return false;
                }
                node = await this._store.get(node.getLastChild());
                nodeChildren = node.getChildren();
                if (node.isTerminal()) {
                    break;
                }
            }
        }

        // Check the terminal nodes.
        if (!node.equals(proof.nodes[0])) {
            return false;
        }

        this._complete = complete;
        return true;
    }

    /**
     * @param {Array.<AccountsTreeNode>} nodes
     * @returns {Promise}
     * @private
     */
    async _putLight(nodes) {
        Assert.that(nodes.every(node => node.isTerminal()), 'Can only build tree from terminal nodes');

        // Fetch the root node.
        let rootNode = await this._store.getRootNode();
        Assert.that(!!rootNode, 'Corrupted store: Failed to fetch AccountsTree root node');

        // TODO: Bulk insertion instead of sequential insertion!
        for (const node of nodes) {
            await this._insertLight(rootNode, node.prefix, node.account, []);
            rootNode = await this._store.getRootNode();
            Assert.that(!!rootNode, 'Corrupted store: Failed to fetch AccountsTree root node');
        }
        await this._updateHashes(rootNode);
    }

    /**
     * This is basically a version of the standard insert method
     * that uses empty hashes instead of hashing the nodes.
     * Hashes are only done once at the end.
     * @param {AccountsTreeNode} node
     * @param {string} prefix
     * @param {Account} account
     * @param {Array.<AccountsTreeNode>} rootPath
     * @returns {Promise}
     * @private
     */
    async _insertLight(node, prefix, account, rootPath) {
        // Find common prefix between node and new address.
        const commonPrefix = StringUtils.commonPrefix(node.prefix, prefix);

        // If the node prefix does not fully match the new address, split the node.
        if (commonPrefix.length !== node.prefix.length) {
            // Insert the new account node.
            const newChild = AccountsTreeNode.terminalNode(prefix, account);
            await this._store.put(newChild);

            // Insert the new parent node.
            const newParent = AccountsTreeNode.branchNode(commonPrefix)
                .withChild(node.prefix, new Hash(null))
                .withChild(newChild.prefix, new Hash(null));
            await this._store.put(newParent);

            return this._updateKeysLight(newParent.prefix, rootPath);
        }

        // If the commonPrefix is the specified address, we have found an (existing) node
        // with the given address. Update the account.
        if (commonPrefix === prefix) {
            // Update the account.
            node = node.withAccount(account);
            await this._store.put(node);

            return this._updateKeysLight(node.prefix, rootPath);
        }

        // If the node prefix matches and there are address bytes left, descend into
        // the matching child node if one exists.
        const childPrefix = node.getChild(prefix);
        if (childPrefix) {
            const childNode = await this._store.get(childPrefix);
            rootPath.push(node);
            return this._insertLight(childNode, prefix, account, rootPath);
        }

        // If no matching child exists, add a new child account node to the current node.
        const newChild = AccountsTreeNode.terminalNode(prefix, account);
        await this._store.put(newChild);

        node = node.withChild(newChild.prefix, new Hash(null));
        await this._store.put(node);

        return this._updateKeysLight(node.prefix, rootPath);
    }

    /**
     * This is a modified version that does not hash nodes.
     * @param {string} prefix
     * @param {Array.<AccountsTreeNode>} rootPath
     * @returns {Promise}
     * @private
     */
    async _updateKeysLight(prefix, rootPath) {
        // Walk along the rootPath towards the root node starting with the
        // immediate predecessor of the node specified by 'prefix'.
        let i = rootPath.length - 1;
        for (; i >= 0; --i) {
            let node = rootPath[i];

            node = node.withChild(prefix, new Hash(null));
            await this._store.put(node); // eslint-disable-line no-await-in-loop
            prefix = node.prefix;
        }
    }

    /**
     * This method updates all empty hashes (and only such).
     * @param {AccountsTreeNode} node
     * @private
     */
    async _updateHashes(node) {
        if (node.isTerminal()) {
            return node.hash();
        }
        // Compute sub hashes if necessary.
        const subHashes = await Promise.all(node.getChildren().map(async child => {
            const currentHash = node.getChildHash(child);
            if (!currentHash.equals(new Hash(null))) {
                return currentHash;
            }
            const childNode = await this._store.get(child);
            return this._updateHashes(childNode);
        }));
        // Then prepare new node and update.
        let newNode = node;
        node.getChildren().forEach((child, i) => {
            newNode = newNode.withChild(child, subHashes[i]);
        });
        await this._store.put(newNode);
        return newNode.hash();
    }

    /** @type {boolean} */
    get complete() {
        return this._complete;
    }

    /** @type {string} */
    get missingPrefix() {
        return this._lastPrefix;
    }

    /**
     * @returns {Promise.<PartialAccountsTree>}
     */
    transaction() {
        const tree = new PartialAccountsTree(this._store.transaction());
        return tree._init();
    }

    /**
     * @returns {Promise}
     */
    commit() {
        return this._store.commit();
    }

    /**
     * @returns {Promise}
     */
    abort() {
        return this._store.abort();
    }
}
PartialAccountsTree.ERR_HASH_MISMATCH = -3;
PartialAccountsTree.ERR_INCORRECT_PROOF = -2;
PartialAccountsTree.ERR_UNMERGEABLE = -1;
PartialAccountsTree.OK_COMPLETE = 0;
PartialAccountsTree.OK_UNFINISHED = 1;
Class.register(PartialAccountsTree);

