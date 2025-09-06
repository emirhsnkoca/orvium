export class BaseModule {
    moduleManager;
    moduleName;
    moduleConfig;
    enabled;
    constructor(manager, name) {
        this.moduleManager = manager;
        this.moduleName = name;
    }
    getModuleName() {
        return this.moduleName;
    }
    enableModule() {
        if (this.enabled)
            return Promise.reject("cannot enable module '" + this.moduleName + "': already enabled");
        this.enabled = true;
        return this.startModule();
    }
    disableModule() {
        if (!this.enabled)
            return Promise.reject("cannot disable module '" + this.moduleName + "': not enabled");
        this.enabled = false;
        return this.stopModule();
    }
    getModuleConfig() {
        return this.moduleConfig;
    }
    setModuleConfig(config) {
        this.moduleConfig = Object.assign({}, this.moduleDefaultConfig, config);
        if (this.enabled)
            this.onConfigReload();
    }
    isEnabled() {
        return this.enabled;
    }
    onConfigReload() { }
    ;
}
//# sourceMappingURL=BaseModule.js.map