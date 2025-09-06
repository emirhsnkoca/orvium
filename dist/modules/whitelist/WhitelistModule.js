import * as fs from 'fs';
import YAML from 'yaml';
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig } from "./WhitelistConfig.js";
import { resolveRelativePath } from "../../config/FaucetConfig.js";
export class WhitelistModule extends BaseModule {
    moduleDefaultConfig = defaultConfig;
    cachedWhitelistEntries;
    cachedWhitelistRefresh;
    async startModule() {
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionStart, 2, "Whitelist check", (session) => this.processSessionStart(session));
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionIpChange, 2, "Whitelist check", (session) => this.processSessionStart(session));
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionRewardFactor, 6, "whitelist factor", (session, rewardFactors) => this.processSessionRewardFactor(session, rewardFactors));
    }
    stopModule() {
        return Promise.resolve();
    }
    onConfigReload() {
        this.cachedWhitelistRefresh = 0;
    }
    async processSessionStart(session) {
        let whitelistEntry = this.getSessionWhitelistEntry(session);
        if (whitelistEntry) {
            session.setSessionData("whitelist", true);
            if (whitelistEntry.skipModules)
                session.setSessionData("skip.modules", whitelistEntry.skipModules);
            if (typeof whitelistEntry.reward === "number")
                session.setSessionData("whitelist.factor", whitelistEntry.reward);
        }
    }
    async processSessionRewardFactor(session, rewardFactors) {
        let rewardPerc = session.getSessionData("whitelist.factor", 100);
        if (rewardPerc !== 100) {
            rewardFactors.push({
                factor: rewardPerc / 100,
                module: this.moduleName,
            });
        }
    }
    refreshCachedWhitelistEntries(force) {
        let now = Math.floor((new Date()).getTime() / 1000);
        let refresh = this.moduleConfig.whitelistFile ? this.moduleConfig.whitelistFile.refresh : 30;
        if (this.cachedWhitelistRefresh > now - refresh && !force)
            return;
        this.cachedWhitelistRefresh = now;
        this.cachedWhitelistEntries = [];
        if (this.moduleConfig.whitelistPattern) {
            Object.keys(this.moduleConfig.whitelistPattern).forEach((pattern) => {
                let entry = this.moduleConfig.whitelistPattern[pattern];
                this.cachedWhitelistEntries.push([pattern, entry]);
            });
        }
        if (this.moduleConfig.whitelistFile && this.moduleConfig.whitelistFile.yaml) {
            // load yaml file
            if (Array.isArray(this.moduleConfig.whitelistFile.yaml))
                this.moduleConfig.whitelistFile.yaml.forEach((file) => this.refreshCachedWhitelistEntriesFromYaml(resolveRelativePath(file)));
            else
                this.refreshCachedWhitelistEntriesFromYaml(resolveRelativePath(this.moduleConfig.whitelistFile.yaml));
        }
    }
    refreshCachedWhitelistEntriesFromYaml(yamlFile) {
        if (!fs.existsSync(yamlFile))
            return;
        let yamlSrc = fs.readFileSync(yamlFile, "utf8");
        let yamlObj = YAML.parse(yamlSrc);
        if (Array.isArray(yamlObj.restrictions)) {
            yamlObj.restrictions.forEach((entry) => {
                let pattern = entry.pattern;
                delete entry.pattern;
                this.cachedWhitelistEntries.push([pattern, entry]);
            });
        }
    }
    getSessionWhitelistEntry(session) {
        let remoteIp = session.getRemoteIP();
        this.refreshCachedWhitelistEntries();
        for (let i = 0; i < this.cachedWhitelistEntries.length; i++) {
            let entry = this.cachedWhitelistEntries[i];
            if (remoteIp.match(new RegExp(entry[0], "mi"))) {
                return entry[1];
            }
        }
        return null;
    }
}
//# sourceMappingURL=WhitelistModule.js.map