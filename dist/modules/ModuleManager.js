import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess.js";
import { ServiceManager } from "../common/ServiceManager.js";
import { faucetConfig } from "../config/FaucetConfig.js";
import { MODULE_CLASSES } from "./modules.js";
export var ModuleHookAction;
(function (ModuleHookAction) {
    ModuleHookAction[ModuleHookAction["ClientConfig"] = 0] = "ClientConfig";
    ModuleHookAction[ModuleHookAction["SessionStart"] = 1] = "SessionStart";
    ModuleHookAction[ModuleHookAction["SessionRestore"] = 2] = "SessionRestore";
    ModuleHookAction[ModuleHookAction["SessionInfo"] = 3] = "SessionInfo";
    ModuleHookAction[ModuleHookAction["SessionRewardFactor"] = 4] = "SessionRewardFactor";
    ModuleHookAction[ModuleHookAction["SessionRewarded"] = 5] = "SessionRewarded";
    ModuleHookAction[ModuleHookAction["SessionIpChange"] = 6] = "SessionIpChange";
    ModuleHookAction[ModuleHookAction["SessionComplete"] = 7] = "SessionComplete";
    ModuleHookAction[ModuleHookAction["SessionClaim"] = 8] = "SessionClaim";
    ModuleHookAction[ModuleHookAction["SessionClaimed"] = 9] = "SessionClaimed";
    ModuleHookAction[ModuleHookAction["SessionClose"] = 10] = "SessionClose";
})(ModuleHookAction || (ModuleHookAction = {}));
export class ModuleManager {
    initialized;
    loadedModules = {};
    moduleHooks;
    loadingPromise;
    async initialize() {
        if (this.initialized)
            throw "already initialized";
        this.initialized = true;
        this.moduleHooks = {};
        await (this.loadingPromise = this.loadModules());
        ServiceManager.GetService(FaucetProcess).addListener("reload", () => {
            this.loadingPromise = this.loadModules();
        });
    }
    getLoadingPromise() {
        return this.loadingPromise;
    }
    async loadModules() {
        let loadedDict = Object.assign({}, this.loadedModules);
        for (let modName in faucetConfig.modules) {
            if (!faucetConfig.modules.hasOwnProperty(modName))
                continue;
            if (!faucetConfig.modules[modName].enabled)
                continue;
            let module;
            if (!(module = loadedDict[modName])) {
                let modClass = MODULE_CLASSES[modName];
                if (!modClass) {
                    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Cannot load module '" + modName + "': unknown module");
                    continue;
                }
                module = this.loadedModules[modName] = new modClass(this, modName);
            }
            else {
                delete loadedDict[modName];
            }
            module.setModuleConfig(faucetConfig.modules[modName]);
            if (!module.isEnabled()) {
                await module.enableModule();
                ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Enabled module: " + modName);
            }
        }
        for (let modName in loadedDict) {
            let module = loadedDict[modName];
            await module.disableModule();
            delete this.loadedModules[modName];
            this.removeModuleHooks(module);
            ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Disabled module: " + modName);
        }
    }
    getModule(moduleName) {
        return this.loadedModules[moduleName];
    }
    addActionHook(module, action, priority, name, hook) {
        let hookList = this.moduleHooks[action];
        if (!hookList)
            hookList = this.moduleHooks[action] = [];
        let hookReg = {
            prio: priority,
            module: module,
            name: name,
            hook: hook,
        };
        let insertIdx = null;
        for (let i = 0; i < hookList.length; i++) {
            if (hookList[i].prio > priority) {
                insertIdx = i;
                break;
            }
        }
        if (insertIdx !== null) {
            hookList.splice(insertIdx, 0, hookReg);
        }
        else {
            hookList.push(hookReg);
        }
    }
    removeModuleHooks(module) {
        for (let action in this.moduleHooks) {
            for (let i = this.moduleHooks[action].length - 1; i >= 0; i--) {
                if (this.moduleHooks[action][i].module === module)
                    this.moduleHooks[action].splice(i, 1);
            }
        }
    }
    getActionHooks(action) {
        if (!this.moduleHooks[action])
            return [];
        return this.moduleHooks[action].slice();
    }
    async processActionHooks(localfns, action, args) {
        let hooks = this.getActionHooks(action);
        let localIdx = 0;
        let hookIdx = 0;
        do {
            let loopPrio;
            if (localfns.length > localIdx && (hookIdx >= hooks.length || localfns[localIdx].prio <= hooks[hookIdx].prio))
                loopPrio = localfns[localIdx].prio;
            else if (hooks.length > hookIdx && (localIdx >= localfns.length || hooks[hookIdx].prio < localfns[localIdx].prio))
                loopPrio = hooks[hookIdx].prio;
            else
                break;
            let promises = [];
            while (localfns.length > localIdx && localfns[localIdx].prio == loopPrio) {
                promises.push(localfns[localIdx].hook.apply(this, args));
                localIdx++;
            }
            while (hooks.length > hookIdx && hooks[hookIdx].prio == loopPrio) {
                promises.push(hooks[hookIdx].hook.apply(this, args));
                hookIdx++;
            }
            await Promise.all(promises);
        } while (localfns.length > localIdx || hooks.length > hookIdx);
    }
}
//# sourceMappingURL=ModuleManager.js.map