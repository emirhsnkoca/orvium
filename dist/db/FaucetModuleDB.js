export class FaucetModuleDB {
    module;
    faucetStore;
    constructor(module, faucetStore) {
        this.module = module;
        this.faucetStore = faucetStore;
    }
    dispose() {
        this.faucetStore.disposeModuleDb(this);
    }
    getModuleName() {
        return this.module.getModuleName();
    }
    get db() {
        return this.faucetStore.getDatabase();
    }
    now() {
        return Math.floor((new Date()).getTime() / 1000);
    }
    async initSchema() {
        await this.faucetStore.upgradeIfNeeded(this.getModuleName(), this.latestSchemaVersion, (version) => this.upgradeSchema(version));
    }
    async cleanStore() {
    }
}
//# sourceMappingURL=FaucetModuleDB.js.map