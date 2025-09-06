import { ServiceManager } from '../../common/ServiceManager.js';
import { BaseModule } from '../BaseModule.js';
import { defaultConfig } from './PassportConfig.js';
import { ModuleHookAction } from '../ModuleManager.js';
import { FaucetSessionStatus } from '../../session/FaucetSession.js';
import { FaucetWebApi } from '../../webserv/FaucetWebApi.js';
import { PassportResolver } from './PassportResolver.js';
import { SessionManager } from '../../session/SessionManager.js';
import { PassportDB } from './PassportDB.js';
import { FaucetDatabase } from '../../db/FaucetDatabase.js';
import { FaucetError } from '../../common/FaucetError.js';
export class PassportModule extends BaseModule {
    moduleDefaultConfig = defaultConfig;
    passportDb;
    passportResolver;
    async startModule() {
        this.passportDb = await ServiceManager.GetService(FaucetDatabase).createModuleDb(PassportDB, this);
        this.passportResolver = new PassportResolver(this);
        this.moduleManager.addActionHook(this, ModuleHookAction.ClientConfig, 1, "passport config", async (clientConfig) => {
            clientConfig[this.moduleName] = {
                refreshTimeout: this.moduleConfig.refreshCooldown,
                manualVerification: (this.moduleConfig.trustedIssuers && this.moduleConfig.trustedIssuers.length > 0),
                stampScoring: this.moduleConfig.stampScoring,
                boostFactor: this.moduleConfig.boostFactor,
                overrideScores: [this.moduleConfig.skipHostingCheckScore, this.moduleConfig.skipProxyCheckScore, this.moduleConfig.requireMinScore],
                guestRefresh: this.moduleConfig.allowGuestRefresh ? (this.moduleConfig.guestRefreshCooldown > 0 ? this.moduleConfig.guestRefreshCooldown : this.moduleConfig.refreshCooldown) : false,
            };
        });
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionStart, 6, "passport", (session) => this.processSessionStart(session));
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionInfo, 1, "passport state", async (session, moduleState) => this.processSessionInfo(session, moduleState));
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionRewardFactor, 5, "passport boost", (session, rewardFactors) => this.processSessionRewardFactor(session, rewardFactors));
        ServiceManager.GetService(FaucetWebApi).registerApiEndpoint("refreshPassport", (req, url, body) => this.processPassportRefresh(req, url, body));
        ServiceManager.GetService(FaucetWebApi).registerApiEndpoint("getPassportInfo", (req, url, body) => this.processGetPassportInfo(req, url, body));
    }
    async stopModule() {
        this.passportDb.dispose();
        ServiceManager.GetService(FaucetWebApi).removeApiEndpoint("refreshPassport");
        ServiceManager.GetService(FaucetWebApi).removeApiEndpoint("getPassportInfo");
    }
    getPassportDb() {
        return this.passportDb;
    }
    onConfigReload() {
        this.passportResolver.increaseScoreNonce(); // refresh cached scores on config reload
    }
    async processSessionStart(session) {
        if (session.getSessionData("skip.modules", []).indexOf(this.moduleName) !== -1)
            return;
        let targetAddr = session.getTargetAddr();
        let passportInfo = await this.passportResolver.getPassport(targetAddr);
        session.setSessionData("passport.refresh", Math.floor(new Date().getTime() / 1000));
        session.setSessionData("passport.data", passportInfo);
        let score = this.passportResolver.getPassportScore(passportInfo);
        session.setSessionData("passport.score", score);
        if (this.moduleConfig.skipHostingCheckScore > 0 && score.score >= this.moduleConfig.skipHostingCheckScore) {
            session.setSessionData("ipinfo.override_hosting", false);
        }
        if (this.moduleConfig.skipProxyCheckScore > 0 && score.score >= this.moduleConfig.skipProxyCheckScore) {
            session.setSessionData("ipinfo.override_proxy", false);
        }
        if (this.moduleConfig.requireMinScore > 0 && score.score < this.moduleConfig.requireMinScore) {
            let err = new FaucetError("PASSPORT_SCORE", "You need a passport score of at least " + this.moduleConfig.requireMinScore + " to use this faucet.");
            err.data = {
                "address": session.getTargetAddr(),
            };
            throw err;
        }
    }
    async processSessionInfo(session, moduleState) {
        if (session.getSessionData("skip.modules", []).indexOf(this.moduleName) !== -1)
            return;
        if (session.getSessionStatus() !== FaucetSessionStatus.RUNNING)
            return;
        let passportInfo = session.getSessionData("passport.data");
        let passportBoost = passportInfo ? this.passportResolver.getPassportScore(passportInfo) : null;
        moduleState[this.moduleName] = passportBoost;
    }
    processSessionRewardFactor(session, rewardFactors) {
        if (session.getSessionData("skip.modules", []).indexOf(this.moduleName) !== -1)
            return;
        let passportInfo = session.getSessionData("passport.data");
        if (!passportInfo)
            return;
        let passportBoost = this.passportResolver.getPassportScore(passportInfo);
        session.setSessionData("passport.score", passportBoost);
        if (passportBoost.factor !== 1) {
            rewardFactors.push({
                factor: passportBoost.factor,
                module: this.moduleName,
            });
        }
    }
    async processPassportRefresh(req, url, body) {
        let sessionId = url.query['session'];
        let session;
        let address;
        let refreshCooldown;
        if (sessionId) {
            if (!(session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]))) {
                return {
                    code: "INVALID_SESSION",
                    error: "Session not found"
                };
            }
            address = session.getTargetAddr();
            refreshCooldown = this.moduleConfig.refreshCooldown;
        }
        else {
            if (!this.moduleConfig.allowGuestRefresh) {
                return {
                    code: "NOT_ALLOWED",
                    error: "Passport refresh not allowed without active session"
                };
            }
            address = url.query['address'];
            if (!address || !address.match(/^0x[0-9a-fA-F]{40}$/) || address.match(/^0x0{40}$/i)) {
                return {
                    code: "INVALID_ADDRESS",
                    error: "Invalid address"
                };
            }
            refreshCooldown = this.moduleConfig.guestRefreshCooldown > 0 ? this.moduleConfig.guestRefreshCooldown : this.moduleConfig.refreshCooldown;
        }
        let now = Math.floor(new Date().getTime() / 1000);
        let passportInfo;
        if (req.method === "POST") {
            // manual refresh
            let verifyResult = await this.passportResolver.verifyUserPassport(address, JSON.parse(body.toString("utf8")));
            if (!verifyResult.valid) {
                return {
                    code: "PASSPORT_VALIDATION",
                    error: "Passport verification failed",
                    errors: verifyResult.errors,
                };
            }
            passportInfo = verifyResult.passportInfo;
        }
        else {
            // auto refresh
            let lastRefresh;
            if (session) {
                lastRefresh = session.getSessionData("passport.refresh") || 0;
            }
            else {
                let cachedPassport = await this.passportResolver.getCachedPassport(address);
                lastRefresh = cachedPassport ? cachedPassport.parsed : 0;
            }
            if (now - lastRefresh < refreshCooldown) {
                return {
                    code: "REFRESH_COOLDOWN",
                    error: "Passport has been refreshed recently. Please wait " + (lastRefresh + refreshCooldown - now) + " sec",
                    cooldown: lastRefresh + refreshCooldown,
                };
            }
            passportInfo = await this.passportResolver.getPassport(address, true);
        }
        let passportScore = this.passportResolver.getPassportScore(passportInfo);
        if (session) {
            session.setSessionData("passport.refresh", now);
            session.setSessionData("passport.data", passportInfo);
            session.setSessionData("passport.score", passportScore);
        }
        return {
            passport: passportInfo,
            score: passportScore,
            cooldown: now + refreshCooldown,
        };
    }
    async processGetPassportInfo(req, url, body) {
        let sessionId = url.query['session'];
        let passportInfo;
        if (sessionId) {
            let session;
            if (!(session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]))) {
                return {
                    code: "INVALID_SESSION",
                    error: "Session not found"
                };
            }
            passportInfo = session.getSessionData("passport.data");
            if (!passportInfo) {
                return {
                    code: "INVALID_PASSPORT",
                    error: "Passport not found"
                };
            }
        }
        else if (!sessionId) {
            if (!this.moduleConfig.allowGuestRefresh) {
                return {
                    code: "NOT_ALLOWED",
                    error: "Passport info not allowed without active session"
                };
            }
            let address = url.query['address'];
            if (!address || !address.match(/^0x[0-9a-fA-F]{40}$/) || address.match(/^0x0{40}$/i)) {
                return {
                    code: "INVALID_ADDRESS",
                    error: "Invalid address"
                };
            }
            passportInfo = await this.passportResolver.getCachedPassport(address);
        }
        return {
            passport: passportInfo,
            score: this.passportResolver.getPassportScore(passportInfo),
        };
    }
}
//# sourceMappingURL=PassportModule.js.map