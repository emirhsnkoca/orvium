import * as hcaptcha from "hcaptcha";
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess.js";
import { ServiceManager } from "../../common/ServiceManager.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig } from "./CaptchaConfig.js";
import { FaucetError } from '../../common/FaucetError.js';
import { FetchUtil } from '../../utils/FetchUtil.js';
export class HCaptchaApi {
    static verify(secret, token, remoteip, sitekey) {
        return hcaptcha.verify(secret, token, remoteip, sitekey);
    }
}
export class CaptchaModule extends BaseModule {
    moduleDefaultConfig = defaultConfig;
    startModule() {
        this.moduleManager.addActionHook(this, ModuleHookAction.ClientConfig, 1, "captcha config", async (clientConfig) => {
            clientConfig[this.moduleName] = {
                provider: this.moduleConfig.provider,
                siteKey: this.moduleConfig.siteKey,
                requiredForStart: this.moduleConfig.checkSessionStart,
                requiredForClaim: this.moduleConfig.checkBalanceClaim,
            };
        });
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionStart, 1, "captcha check", async (session, userInput) => this.processSessionStart(session, userInput));
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionClaim, 1, "captcha check", async (sessionData, userInput) => this.processSessionClaim(sessionData, userInput));
        return Promise.resolve();
    }
    stopModule() {
        // nothing to do
        return Promise.resolve();
    }
    async processSessionStart(session, userInput) {
        if (!this.moduleConfig.checkSessionStart)
            return;
        if (!userInput.captchaToken)
            throw new FaucetError("INVALID_CAPTCHA", "captcha check failed: captcha token missing");
        let result = await this.verifyToken(userInput.captchaToken, session.getRemoteIP(), "session");
        if (typeof result === "string")
            session.setSessionData("captcha.ident", result);
        else if (!result)
            throw new FaucetError("INVALID_CAPTCHA", "captcha check failed: invalid token");
    }
    async processSessionClaim(sessionData, userInput) {
        if (!this.moduleConfig.checkBalanceClaim)
            return;
        if (!userInput.captchaToken)
            throw new FaucetError("INVALID_CAPTCHA", "captcha check failed: captcha token missing");
        let result = await this.verifyToken(userInput.captchaToken, sessionData.remoteIP, "claim");
        if (!result)
            throw new FaucetError("INVALID_CAPTCHA", "captcha check failed: invalid token");
    }
    async verifyToken(token, remoteIp, variant) {
        switch (this.moduleConfig.provider) {
            case "hcaptcha":
                return await this.verifyHCaptchaToken(token, remoteIp);
            case "recaptcha":
                return await this.verifyReCaptchaToken(token, remoteIp);
            case "turnstile":
                return await this.verifyTurnstileToken(token, remoteIp);
            case "custom":
                return await this.verifyCustomToken(token, remoteIp, variant);
            default:
                return true;
        }
    }
    async verifyHCaptchaToken(token, remoteIp) {
        let hcaptchaResponse = await HCaptchaApi.verify(this.moduleConfig.secret, token, remoteIp, this.moduleConfig.siteKey);
        return hcaptchaResponse.success;
    }
    async verifyReCaptchaToken(token, remoteIp) {
        let verifyData = new URLSearchParams();
        verifyData.append("secret", this.moduleConfig.secret);
        verifyData.append("response", token);
        verifyData.append("remoteip", remoteIp);
        let verifyRsp = await FetchUtil.fetchWithTimeout("https://www.google.com/recaptcha/api/siteverify", {
            method: 'POST',
            body: verifyData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }, 10000).then((rsp) => rsp.json());
        if (!verifyRsp || !verifyRsp.success)
            return false;
        return true;
    }
    async verifyTurnstileToken(token, remoteIp) {
        let verifyData = new URLSearchParams();
        verifyData.append("secret", this.moduleConfig.secret);
        verifyData.append("response", token);
        verifyData.append("remoteip", remoteIp);
        let verifyRsp = await FetchUtil.fetchWithTimeout("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: 'POST',
            body: verifyData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }, 10000).then((rsp) => rsp.json());
        if (!verifyRsp || !verifyRsp.success)
            return false;
        return true;
    }
    async verifyCustomToken(token, remoteIp, variant) {
        let verifyData = new URLSearchParams();
        verifyData.append("response", token);
        verifyData.append("remoteip", remoteIp);
        verifyData.append("variant", variant);
        let verifyRsp = await FetchUtil.fetchWithTimeout(this.moduleConfig.secret, {
            method: 'POST',
            body: verifyData,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }, 20000).then((rsp) => rsp.json());
        if (!verifyRsp || !verifyRsp.success) {
            ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Captcha verification failed: " + (verifyRsp?.info || ""));
            return false;
        }
        return verifyRsp.ident || true;
    }
}
//# sourceMappingURL=CaptchaModule.js.map