class AccountsTree extends Observable {
    /**
     * @returns {Promise.<AccountsTree>}
     */
    static async getPersistent(jdb) {
        const store = AccountsTreeStore.getPersistent(jdb);
        const tree = new AccountsTree(store);
        return tree._init();
    }

    /**
     * @returns {Promise.<AccountsTree>}
     */
    static async createVolatile() {
        const store = AccountsTreeStore.createVolatile();
        const tree = new AccountsTree(store);
        return tree._init();
    }

    /**
     * @private
     * @param {AccountsTreeStore} store
     * @returns {AccountsTree}
     */
    constructor(store) {
        super();
        /** @type {AccountsTreeStore} */
        this._store = store;
        this._synchronizer = new Synchronizer();
    }

    /**
     * @returns {Promise.<AccountsTree>}
     * @protected
     */
    async _init() {
        let rootNode = await this._store.getRootNode();
        if (!rootNode) {
            rootNode = AccountsTreeNode.branchNode(/*prefix*/ '', /*childrenSuffixes*/ [], /*childrenHashes*/ []);
            await this._store.put(rootNode);
        }
        return this;
    }

    /**
     * @param {Address} address
     * @param {Account} account
     * @returns {Promise}
     */
    put(address, account) {
        return this._synchronizer.push(() => {
            return this._put(address, account);
        });
    }

    /**
     * @param {Address} address
     * @param {Account} account
     * @returns {Promise}
     */
    putBatch(address, account) {
        return this._synchronizer.push(() => {
            return this._putBatch(address, account);
        });
    }

    /**
     * @returns {Promise}
     */
    finalizeBatch() {
        return this._synchronizer.push(async () => {
            const rootNode = await this._store.getRootNode();
            return this._updateHashes(rootNode);
        });
    }

    /**
     * @param {Address} address
     * @param {Account} account
     * @returns {Promise}
     * @private
     */
    async _putBatch(address, account) {
        if (Account.INITIAL.equals(account) && !(await this.get(address))) {
            return;
        }

        // Fetch the root node.
        const rootNode = await this._store.getRootNode();
        Assert.that(!!rootNode, 'Corrupted store: Failed to fetch AccountsTree root node');

        // Insert account into the tree at address.
        const prefix = address.toHex();
        await this._insertBatch(rootNode, prefix, account, []);

        // Tell listeners that the account at address has changed.
        this.fire(address.toBase64(), account, address);
    }

    /**
     * @param {AccountsTreeNode} node
     * @param {string} prefix
     * @param {Account} account
     * @param {Array.<AccountsTreeNode>} rootPath
     * @returns {Promise}
     * @protected
     */
    async _insertBatch(node, prefix, account, rootPath) {
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

            return this._updateKeysBatch(newParent.prefix, rootPath);
        }

        // If the commonPrefix is the specified address, we have found an (existing) node
        // with the given address. Update the account.
        if (commonPrefix === prefix) {
            // XXX How does this generalize to more than one account type?
            // Special case: If the new balance is the initial balance
            // (i.e. balance=0, nonce=0), it is like the account never existed
            // in the first place. Delete the node in this case.
            if (Account.INITIAL.equals(account)) {
                await this._store.remove(node);
                // We have already deleted the node, remove the subtree it was on.
                return this._pruneBatch(node.prefix, rootPath);
            }

            // Update the account.
            node = node.withAccount(account);
            await this._store.put(node);

            return this._updateKeysBatch(node.prefix, rootPath);
        }

        // If the node prefix matches and there are address bytes left, descend into
        // the matching child node if one exists.
        const childPrefix = node.getChild(prefix);
        if (childPrefix) {
            const childNode = await this._store.get(childPrefix);
            rootPath.push(node);
            return this._insertBatch(childNode, prefix, account, rootPath);
        }

        // If no matching child exists, add a new child account node to the current node.
        const newChild = AccountsTreeNode.terminalNode(prefix, account);
        await this._store.put(newChild);

        node = node.withChild(newChild.prefix, new Hash(null));
        await this._store.put(node);

        return this._updateKeysBatch(node.prefix, rootPath);
    }

    /**
     * @param {string} prefix
     * @param {Array.<AccountsTreeNode>} rootPath
     * @returns {Promise}
     * @private
     */
    async _pruneBatch(prefix, rootPath) {
        // Walk along the rootPath towards the root node starting with the
        // immediate predecessor of the node specified by 'prefix'.
        let i = rootPath.length - 1;
        for (; i >= 0; --i) {
            let node = rootPath[i];

            node = node.withoutChild(prefix);

            // If the node has only a single child, merge it with the next node.
            if (node.hasSingleChild() && node.prefix !== '') {
                await this._store.remove(node); // eslint-disable-line no-await-in-loop

                const childPrefix = node.getFirstChild();
                const childNode = await this._store.get(childPrefix); // eslint-disable-line no-await-in-loop

                await this._store.put(childNode); // eslint-disable-line no-await-in-loop
                return this._updateKeysBatch(childNode.prefix, rootPath.slice(0, i));
            }
            // Otherwise, if the node has children left, update it and all keys on the
            // remaining root path. Pruning finished.
            // XXX Special case: We start with an empty root node. Don't delete it.
            else if (node.hasChildren() || node.prefix === '') {
                await this._store.put(node); // eslint-disable-line no-await-in-loop
                return this._updateKeysBatch(node.prefix, rootPath.slice(0, i));
            }

            // The node has no children left, continue pruning.
            prefix = node.prefix;
        }

        // XXX This should never be reached.
        return undefined;
    }

    /**
     * @param {string} prefix
     * @param {Array.<AccountsTreeNode>} rootPath
     * @returns {Promise}
     * @private
     */
    async _updateKeysBatch(prefix, rootPath) {
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
     * @protected
     */
    async _updateHashes(node) {
        if (node.isTerminal()) {
            return node.hash();
        }
        const zeroHash = new Hash(null);
        // Compute sub hashes if necessary.
        const subHashes = await Promise.all(node.getChildren().map(async child => {
            const currentHash = node.getChildHash(child);
            if (!currentHash.equals(zeroHash)) {
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

    /**
     * @param {Address} address
     * @param {Account} account
     * @returns {Promise}
     * @private
     */
    async _put(address, account) {
        if (Account.INITIAL.equals(account) && !(await this.get(address))) {
            return;
        }

        // Fetch the root node.
        const rootNode = await this._store.getRootNode();
        Assert.that(!!rootNode, 'Corrupted store: Failed to fetch AccountsTree root node');

        // Insert account into the tree at address.
        const prefix = address.toHex();
        await this._insert(rootNode, prefix, account, []);

        // Tell listeners that the account at address has changed.
        this.fire(address.toBase64(), account, address);
    }

    /**
     * @param {AccountsTreeNode} node
     * @param {string} prefix
     * @param {Account} account
     * @param {Array.<AccountsTreeNode>} rootPath
     * @returns {Promise}
     * @private
     */
    async _insert(node, prefix, account, rootPath) {
        // Find common prefix between node and new address.
        const commonPrefix = StringUtils.commonPrefix(node.prefix, prefix);

        // If the node prefix does not fully match the new address, split the node.
        if (commonPrefix.length !== node.prefix.length) {
            // Insert the new account node.
            const newChild = AccountsTreeNode.terminalNode(prefix, account);
            const newChildHash = await newChild.hash();
            await this._store.put(newChild);

            // Insert the new parent node.
            const newParent = AccountsTreeNode.branchNode(commonPrefix)
                .withChild(node.prefix, await node.hash())
                .withChild(newChild.prefix, newChildHash);
            const newParentHash = await newParent.hash();
            await this._store.put(newParent);

            return this._updateKeys(newParent.prefix, newParentHash, rootPath);
        }

        // If the commonPrefix is the specified address, we have found an (existing) node
        // with the given address. Update the account.
        if (commonPrefix === prefix) {
            // XXX How does this generalize to more than one account type?
            // Special case: If the new balance is the initial balance
            // (i.e. balance=0, nonce=0), it is like the account never existed
            // in the first place. Delete the node in this case.
            if (Account.INITIAL.equals(account)) {
                await this._store.remove(node);
                // We have already deleted the node, remove the subtree it was on.
                return this._prune(node.prefix, rootPath);
            }

            // Update the account.
            node = node.withAccount(account);
            const nodeHash = await node.hash();
            await this._store.put(node);

            return this._updateKeys(node.prefix, nodeHash, rootPath);
        }

        // If the node prefix matches and there are address bytes left, descend into
        // the matching child node if one exists.
        const childPrefix = node.getChild(prefix);
        if (childPrefix) {
            const childNode = await this._store.get(childPrefix);
            rootPath.push(node);
            return this._insert(childNode, prefix, account, rootPath);
        }

        // If no matching child exists, add a new child account node to the current node.
        const newChild = AccountsTreeNode.terminalNode(prefix, account);
        const newChildHash = await newChild.hash();
        await this._store.put(newChild);

        node = node.withChild(newChild.prefix, newChildHash);
        const nodeHash = await node.hash();
        await this._store.put(node);

        return this._updateKeys(node.prefix, nodeHash, rootPath);
    }

    /**
     * @param {string} prefix
     * @param {Array.<AccountsTreeNode>} rootPath
     * @returns {Promise}
     * @private
     */
    async _prune(prefix, rootPath) {
        // Walk along the rootPath towards the root node starting with the
        // immediate predecessor of the node specified by 'prefix'.
        let i = rootPath.length - 1;
        for (; i >= 0; --i) {
            let node = rootPath[i];

            node = node.withoutChild(prefix);

            // If the node has only a single child, merge it with the next node.
            if (node.hasSingleChild() && node.prefix !== '') {
                await this._store.remove(node); // eslint-disable-line no-await-in-loop

                const childPrefix = node.getFirstChild();
                const childNode = await this._store.get(childPrefix); // eslint-disable-line no-await-in-loop

                await this._store.put(childNode); // eslint-disable-line no-await-in-loop
                const childHash = await childNode.hash();
                return this._updateKeys(childNode.prefix, childHash, rootPath.slice(0, i));
            }
            // Otherwise, if the node has children left, update it and all keys on the
            // remaining root path. Pruning finished.
            // XXX Special case: We start with an empty root node. Don't delete it.
            else if (node.hasChildren() || node.prefix === '') {
                const nodeHash = await node.hash();
                await this._store.put(node); // eslint-disable-line no-await-in-loop
                return this._updateKeys(node.prefix, nodeHash, rootPath.slice(0, i));
            }

            // The node has no children left, continue pruning.
            prefix = node.prefix;
        }

        // XXX This should never be reached.
        return undefined;
    }

    /**
     * @param {string} prefix
     * @param {Hash} nodeHash
     * @param {Array.<AccountsTreeNode>} rootPath
     * @returns {Promise}
     * @private
     */
    async _updateKeys(prefix, nodeHash, rootPath) {
        // Walk along the rootPath towards the root node starting with the
        // immediate predecessor of the node specified by 'prefix'.
        let i = rootPath.length - 1;
        for (; i >= 0; --i) {
            let node = rootPath[i];

            node = node.withChild(prefix, nodeHash);
            await this._store.put(node); // eslint-disable-line no-await-in-loop
            nodeHash = await node.hash(); // eslint-disable-line no-await-in-loop
            prefix = node.prefix;
        }

        return nodeHash;
    }

    /**
     * @param {Address} address
     * @returns {Promise.<?Account>}
     */
    async get(address) {
        const node = await this._store.get(address.toHex());
        return node !== undefined ? node.account : null;
    }

    /**
     * @param {Array.<Address>} addresses
     * @returns {Promise.<AccountsProof>}
     */
    async getAccountsProof(addresses) {
        const rootNode = await this._store.getRootNode();
        Assert.that(!!rootNode, 'Corrupted store: Failed to fetch AccountsTree root node');

        const prefixes = [];
        for (const address of addresses) {
            prefixes.push(address.toHex());
        }
        // We sort the addresses to simplify traversal in post order (leftmost addresses first).
        prefixes.sort();

        const nodes = [];
        await this._getAccountsProof(rootNode, prefixes, nodes);
        return new AccountsProof(nodes);
    }

    /**
     * Constructs the accounts proof in post-order.
     * @param {AccountsTreeNode} node
     * @param {Array.<string>} prefixes
     * @param {Array.<AccountsTreeNode>} nodes
     * @returns {Promise.<*>}
     * @private
     */
    async _getAccountsProof(node, prefixes, nodes) {
        // For each prefix, descend the tree individually.
        let includeNode = false;
        for (let i = 0; i < prefixes.length; ) {
            let prefix = prefixes[i];

            // Find common prefix between node and the current requested prefix.
            const commonPrefix = StringUtils.commonPrefix(node.prefix, prefix);

            // If the prefix fully matches, we have found the requested node.
            // If the prefix does not fully match, the requested address is not part of this node.
            // Include the node in the proof nevertheless to prove that the account doesn't exist.
            if (commonPrefix.length !== node.prefix.length || node.prefix === prefix) {
                includeNode = true;
                i++;
                continue;
            }

            // Descend into the matching child node if one exists.
            const childKey = node.getChild(prefix);
            if (childKey) {
                const childNode = await this._store.get(childKey); // eslint-disable-line no-await-in-loop

                // Group addresses with same prefix:
                // Because of our ordering, they have to be located next to the current prefix.
                // Hence, we iterate over the next prefixes, until we don't find commonalities anymore.
                // In the next main iteration we can skip those we already requested here.
                const subPrefixes = [prefix];
                // Find other prefixes to descend into this tree as well.
                let j = i + 1;
                for (; j < prefixes.length; ++j) {
                    // Since we ordered prefixes, there can't be any other prefixes with commonalities.
                    if (!prefixes[j].startsWith(childNode.prefix)) break;
                    // But if there is a commonality, add it to the list.
                    subPrefixes.push(prefixes[j]);
                }
                // Now j is the last index which doesn't have commonalities,
                // we continue from there in the next iteration.
                i = j;

                includeNode = (await this._getAccountsProof(childNode, subPrefixes, nodes)) || includeNode; // eslint-disable-line no-await-in-loop
            }
            // No child node exists with the requested prefix. Include the current node to prove the absence of the requested account.
            else {
                includeNode = true;
                i++;
            }
        }

        // If this branch contained at least one account, we add this node.
        if (includeNode) {
            nodes.push(node);
        }

        return includeNode;
    }

    /**
     * @param {string} startPrefix The prefix to start with.
     * @param {number} size The maximum number of terminal nodes to include.
     * @returns {Promise.<AccountsTreeChunk>}
     */
    async getChunk(startPrefix, size) {
        const chunk = await this._store.getTerminalNodes(startPrefix, size);
        const lastNode = chunk.pop();
        const proof = await this.getAccountsProof([Address.fromHex(lastNode.prefix)]);
        return new AccountsTreeChunk(chunk, proof);
    }

    /**
     * @param {boolean} [enableWatchdog}
     * @returns {Promise.<AccountsTree>}
     */
    transaction(enableWatchdog = true) {
        const tree = new AccountsTree(this._store.transaction(enableWatchdog));
        return tree._init();
    }

    /**
     * @returns {Promise.<PartialAccountsTree>}
     */
    async partialTree() {
        const tx = this._store.transaction();
        await tx.truncate();
        const tree = new PartialAccountsTree(tx);
        return tree._init();
    }

    /**
     * @returns {Promise.<AccountsTree>}
     */
    snapshot() {
        const tree = new AccountsTree(this._store.snapshot());
        return tree._init();
    }

    /**
     * @returns {Promise}
     */
    async commit() {
        const rootHash = await this.root();
        Assert.that(!rootHash.equals(new Hash(null)));
        return this._store.commit();
    }

    /**
     * @returns {Promise}
     */
    abort() {
        return this._store.abort();
    }

    /**
     * @returns {Promise.<Hash>}
     */
    async root() {
        const rootNode = await this._store.getRootNode();
        return rootNode && rootNode.hash();
    }
}
Class.register(AccountsTree);

