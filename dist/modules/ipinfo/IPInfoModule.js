import * as fs from 'fs';
import YAML from 'yaml';
import { ServiceManager } from "../../common/ServiceManager.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { FaucetError } from '../../common/FaucetError.js';
import { defaultConfig } from "./IPInfoConfig.js";
import { IPInfoResolver } from "./IPInfoResolver.js";
import { resolveRelativePath } from "../../config/FaucetConfig.js";
import { IPInfoDB } from './IPInfoDB.js';
import { FaucetDatabase } from '../../db/FaucetDatabase.js';
import { FaucetLogLevel, FaucetProcess } from '../../common/FaucetProcess.js';
export class IPInfoModule extends BaseModule {
    moduleDefaultConfig = defaultConfig;
    ipInfoDb;
    ipInfoResolver;
    ipInfoMatchRestrictions;
    ipInfoMatchRestrictionsRefresh;
    sessionRewardFactorCacheTimeout = 30;
    async startModule() {
        this.ipInfoDb = await ServiceManager.GetService(FaucetDatabase).createModuleDb(IPInfoDB, this);
        this.ipInfoResolver = new IPInfoResolver(this.ipInfoDb, this.moduleConfig.apiUrl);
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionStart, 7, "IP Info check", (session) => this.processSessionStart(session));
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionIpChange, 6, "IP Info check", (session) => this.processSessionStart(session));
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionRewardFactor, 6, "IP restrictions", (session, rewardFactors) => this.processSessionRewardFactor(session, rewardFactors));
    }
    stopModule() {
        this.ipInfoDb.dispose();
        this.ipInfoResolver.dispose();
        return Promise.resolve();
    }
    onConfigReload() {
        this.ipInfoResolver.setApi(this.moduleConfig.apiUrl);
        this.ipInfoMatchRestrictionsRefresh = 0;
    }
    async processSessionStart(session) {
        if (session.getSessionData("skip.modules", []).indexOf(this.moduleName) !== -1)
            return;
        let remoteIp = session.getRemoteIP();
        let ipInfo;
        try {
            ipInfo = await this.ipInfoResolver.getIpInfo(remoteIp);
            if (ipInfo.status !== "success" && this.moduleConfig.required)
                throw new FaucetError("INVALID_IPINFO", "Error while checking your IP: " + ipInfo.status);
        }
        catch (ex) {
            ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Error while fetching IP-Info for " + remoteIp + ": " + ex.toString());
            if (this.moduleConfig.required)
                throw new FaucetError("INVALID_IPINFO", "Error while checking your IP: " + ex.toString());
        }
        let overrideHosting = session.getSessionData("ipinfo.override_hosting", undefined);
        if (overrideHosting !== undefined) {
            ipInfo.hosting = overrideHosting;
        }
        let overrideProxy = session.getSessionData("ipinfo.override_proxy", undefined);
        if (overrideProxy !== undefined) {
            ipInfo.proxy = overrideProxy;
        }
        session.setSessionData("ipinfo.data", ipInfo);
        let sessionRestriction = this.getSessionRestriction(session);
        if (sessionRestriction.blocked) {
            let err = new FaucetError("IPINFO_RESTRICTION", "IP Blocked: " + sessionRestriction.messages.map((msg) => msg.text).join(", "));
            if (sessionRestriction.hostingBased || sessionRestriction.proxyBased) {
                err.data = {
                    "address": session.getTargetAddr(),
                    "ipflags": [sessionRestriction.hostingBased, sessionRestriction.proxyBased],
                };
            }
            throw err;
        }
        session.setSessionModuleRef("ipinfo.restriction.time", Math.floor((new Date()).getTime() / 1000));
        session.setSessionModuleRef("ipinfo.restriction.data", sessionRestriction);
    }
    async processSessionRewardFactor(session, rewardFactors) {
        if (session.getSessionData("skip.modules", []).indexOf(this.moduleName) !== -1)
            return;
        let refreshTime = session.getSessionModuleRef("ipinfo.restriction.time") || 0;
        let now = Math.floor((new Date()).getTime() / 1000);
        let sessionRestriction;
        if (now - refreshTime > this.sessionRewardFactorCacheTimeout) {
            sessionRestriction = this.getSessionRestriction(session);
            session.setSessionModuleRef("ipinfo.restriction.time", Math.floor((new Date()).getTime() / 1000));
            session.setSessionModuleRef("ipinfo.restriction.data", sessionRestriction);
            if (sessionRestriction.blocked) {
                let blockReason = "IP Blocked: " + sessionRestriction.messages.map((msg) => msg.text).join(", ");
                if (sessionRestriction.blocked == "kill") {
                    await session.setSessionFailed("RESTRICTION", blockReason);
                }
                else {
                    await session.completeSession();
                }
                return;
            }
        }
        else
            sessionRestriction = session.getSessionModuleRef("ipinfo.restriction.data");
        if (sessionRestriction.reward !== 100) {
            rewardFactors.push({
                factor: sessionRestriction.reward / 100,
                module: this.moduleName,
            });
        }
    }
    getIPInfoString(session, ipinfo) {
        let infoStr = [
            "ETH: " + session.getTargetAddr(),
            "IP: " + session.getRemoteIP(),
            "Ident: " + (session.getSessionData("captcha.ident") || ""),
        ];
        if (ipinfo) {
            infoStr.push("Country: " + ipinfo.countryCode, "Region: " + ipinfo.regionCode, "City: " + ipinfo.city, "ISP: " + ipinfo.isp, "Org: " + ipinfo.org, "AS: " + ipinfo.as, "Proxy: " + (ipinfo.proxy ? "true" : "false"), "Hosting: " + (ipinfo.hosting ? "true" : "false"));
        }
        return infoStr.join("\n");
    }
    refreshIpInfoMatchRestrictions(force) {
        let now = Math.floor((new Date()).getTime() / 1000);
        let refresh = this.moduleConfig.restrictionsFile ? this.moduleConfig.restrictionsFile.refresh : 30;
        if (this.ipInfoMatchRestrictionsRefresh > now - refresh && !force)
            return;
        this.ipInfoMatchRestrictionsRefresh = now;
        this.ipInfoMatchRestrictions = [];
        Object.keys(this.moduleConfig.restrictionsPattern).forEach((pattern) => {
            this.ipInfoMatchRestrictions.push([pattern, this.moduleConfig.restrictionsPattern[pattern]]);
        });
        if (this.moduleConfig.restrictionsFile && this.moduleConfig.restrictionsFile.file && fs.existsSync(resolveRelativePath(this.moduleConfig.restrictionsFile.file))) {
            // load restrictions list
            fs.readFileSync(this.moduleConfig.restrictionsFile.file, "utf8").split(/\r?\n/).forEach((line) => {
                let match = /^([0-9]{1,2}): (.*)$/.exec(line);
                if (!match)
                    return;
                this.ipInfoMatchRestrictions.push([match[2], parseInt(match[1])]);
            });
        }
        if (this.moduleConfig.restrictionsFile && this.moduleConfig.restrictionsFile.yaml) {
            // load yaml file
            if (Array.isArray(this.moduleConfig.restrictionsFile.yaml))
                this.moduleConfig.restrictionsFile.yaml.forEach((file) => this.refreshIpInfoMatchRestrictionsFromYaml(resolveRelativePath(file)));
            else
                this.refreshIpInfoMatchRestrictionsFromYaml(resolveRelativePath(this.moduleConfig.restrictionsFile.yaml));
        }
    }
    refreshIpInfoMatchRestrictionsFromYaml(yamlFile) {
        if (!fs.existsSync(yamlFile))
            return;
        let yamlSrc = fs.readFileSync(yamlFile, "utf8");
        let yamlObj = YAML.parse(yamlSrc);
        if (Array.isArray(yamlObj.restrictions)) {
            yamlObj.restrictions.forEach((entry) => {
                let pattern = entry.pattern;
                delete entry.pattern;
                this.ipInfoMatchRestrictions.push([pattern, entry]);
            });
        }
    }
    wrapFactorRestriction(restriction) {
        if (typeof restriction === "number") {
            return {
                reward: restriction,
            };
        }
        return restriction;
    }
    getSessionRestriction(session) {
        let restriction = {
            reward: 100,
            messages: [],
            blocked: false,
            hostingBased: false,
            proxyBased: false,
        };
        let msgKeyDict = {};
        let sessionIpInfo = session.getSessionData("ipinfo.data");
        let applyRestriction = (restr) => {
            restr = this.wrapFactorRestriction(restr);
            if (restr.reward < restriction.reward)
                restriction.reward = restr.reward;
            if (restr.blocked) {
                if (restr.blocked === "close" && !restriction.blocked)
                    restriction.blocked = restr.blocked;
                else if (restr.blocked === "kill")
                    restriction.blocked = restr.blocked;
                else if (restr.blocked === true && !restriction.blocked)
                    restriction.blocked = "close";
            }
            if (restr.message && (!restr.msgkey || !msgKeyDict.hasOwnProperty(restr.msgkey))) {
                if (restr.msgkey)
                    msgKeyDict[restr.msgkey] = true;
                restriction.messages.push({
                    text: restr.message,
                    notify: restr.notify,
                    key: restr.msgkey,
                });
            }
        };
        if (sessionIpInfo && this.moduleConfig.restrictions) {
            if (sessionIpInfo.hosting && this.moduleConfig.restrictions.hosting) {
                applyRestriction(this.moduleConfig.restrictions.hosting);
                restriction.hostingBased = true;
            }
            if (sessionIpInfo.proxy && this.moduleConfig.restrictions.proxy) {
                applyRestriction(this.moduleConfig.restrictions.proxy);
                restriction.proxyBased = true;
            }
            if (sessionIpInfo.countryCode && typeof this.moduleConfig.restrictions[sessionIpInfo.countryCode] !== "undefined")
                applyRestriction(this.moduleConfig.restrictions[sessionIpInfo.countryCode]);
        }
        if (this.moduleConfig.restrictionsPattern || this.moduleConfig.restrictionsFile) {
            this.refreshIpInfoMatchRestrictions();
            let infoStr = this.getIPInfoString(session, sessionIpInfo);
            this.ipInfoMatchRestrictions.forEach((entry) => {
                if (infoStr.match(new RegExp(entry[0], "mi"))) {
                    applyRestriction(entry[1]);
                }
            });
        }
        return restriction;
    }
}
//# sourceMappingURL=IPInfoModule.js.map