import { faucetConfig } from "../config/FaucetConfig.js";
import { ServiceManager } from "../common/ServiceManager.js";
import { EthWalletManager } from "../eth/EthWalletManager.js";
import { FaucetStatus } from "../services/FaucetStatus.js";
import { FaucetHttpResponse } from "./FaucetHttpServer.js";
import { SessionManager } from "../session/SessionManager.js";
import { FaucetSessionStatus } from "../session/FaucetSession.js";
import { ModuleHookAction, ModuleManager } from "../modules/ModuleManager.js";
import { FaucetError } from "../common/FaucetError.js";
import { EthClaimManager } from "../eth/EthClaimManager.js";
import { buildFaucetStatus, buildQueueStatus, buildSessionStatus } from "./api/faucetStatus.js";
import { sha256 } from "../utils/CryptoUtils.js";
export const FAUCETSTATUS_CACHE_TIME = 10;
export class FaucetWebApi {
    apiEndpoints = {};
    cachedStatusData = {};
    async onApiRequest(req, body) {
        let apiUrl = this.parseApiUrl(req.url);
        if (!apiUrl || apiUrl.path.length === 0)
            return new FaucetHttpResponse(404, "Not Found");
        switch (apiUrl.path[0].toLowerCase()) {
            case "getVersion".toLowerCase():
                return this.onGetVersion();
            case "getMaxReward".toLowerCase():
                return this.onGetMaxReward();
            case "getFaucetConfig".toLowerCase():
                return this.onGetFaucetConfig(apiUrl.query['cliver'], apiUrl.query['session']);
            case "startSession".toLowerCase():
                return this.onStartSession(req, body, apiUrl.query['cliver']);
            case "getSession".toLowerCase():
                return this.onGetSession(apiUrl.query['session']);
            case "claimReward".toLowerCase():
                return this.onClaimReward(req, body);
            case "getSessionStatus".toLowerCase():
                return this.onGetSessionStatus(apiUrl.query['session'], !!apiUrl.query['details']);
            case "getQueueStatus".toLowerCase():
                return this.onGetQueueStatus();
            case "getFaucetStatus".toLowerCase():
                return this.onGetFaucetStatus(apiUrl.query['key']);
            default:
                let handler;
                if ((handler = this.apiEndpoints[apiUrl.path[0].toLowerCase()]))
                    return handler(req, apiUrl, body);
        }
        return new FaucetHttpResponse(404, "Not Found");
    }
    registerApiEndpoint(endpoint, handler) {
        this.apiEndpoints[endpoint.toLowerCase()] = handler;
    }
    removeApiEndpoint(endpoint) {
        delete this.apiEndpoints[endpoint.toLowerCase()];
    }
    parseApiUrl(url) {
        let urlMatch = /\/api\/([^?]+)(?:\?(.*))?/.exec(url);
        if (!urlMatch)
            return null;
        let urlRes = {
            path: urlMatch[1] && urlMatch[1].length > 0 ? urlMatch[1].split("/") : [],
            query: {}
        };
        if (urlMatch[2] && urlMatch[2].length > 0) {
            urlMatch[2].split("&").forEach((query) => {
                let parts = query.split("=", 2);
                urlRes.query[parts[0]] = (parts.length == 1) ? true : parts[1];
            });
        }
        return urlRes;
    }
    getRemoteAddr(req) {
        let remoteAddr = null;
        if (faucetConfig.httpProxyCount > 0 && req.headers['x-forwarded-for']) {
            let proxyChain = req.headers['x-forwarded-for'].split(", ");
            let clientIpIdx = proxyChain.length - faucetConfig.httpProxyCount;
            if (clientIpIdx < 0)
                clientIpIdx = 0;
            remoteAddr = proxyChain[clientIpIdx];
        }
        if (!remoteAddr)
            remoteAddr = req.socket.remoteAddress;
        return remoteAddr;
    }
    onGetVersion() {
        return faucetConfig.faucetVersion;
    }
    onGetMaxReward() {
        return faucetConfig.maxDropAmount;
    }
    getFaucetHomeHtml() {
        let ethWalletManager = ServiceManager.GetService(EthWalletManager);
        let faucetHtml = faucetConfig.faucetHomeHtml || "";
        faucetHtml = faucetHtml.replace(/{faucetWallet}/, () => {
            return ethWalletManager.getFaucetAddress();
        });
        return faucetHtml;
    }
    onGetFaucetConfig(clientVersion, sessionId) {
        let faucetSession = sessionId ? ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING, FaucetSessionStatus.CLAIMABLE]) : null;
        let faucetStatus = ServiceManager.GetService(FaucetStatus).getFaucetStatus(clientVersion, faucetSession);
        let ethWalletManager = ServiceManager.GetService(EthWalletManager);
        let moduleConfig = {};
        ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.ClientConfig, [moduleConfig, sessionId]);
        return {
            faucetTitle: faucetConfig.faucetTitle,
            faucetStatus: faucetStatus.status,
            faucetStatusHash: faucetStatus.hash,
            faucetImage: faucetConfig.faucetImage,
            faucetHtml: this.getFaucetHomeHtml(),
            faucetCoinSymbol: faucetConfig.faucetCoinSymbol,
            faucetCoinType: faucetConfig.faucetCoinType,
            faucetCoinContract: faucetConfig.faucetCoinContract,
            faucetCoinDecimals: ethWalletManager.getFaucetDecimals(),
            minClaim: faucetConfig.minDropAmount,
            maxClaim: faucetConfig.maxDropAmount,
            sessionTimeout: faucetConfig.sessionTimeout,
            ethTxExplorerLink: faucetConfig.ethTxExplorerLink,
            time: Math.floor((new Date()).getTime() / 1000),
            resultSharing: faucetConfig.resultSharing,
            modules: moduleConfig,
        };
    }
    async onStartSession(req, body, clientVersion) {
        if (req.method !== "POST")
            return new FaucetHttpResponse(405, "Method Not Allowed");
        let userInput = JSON.parse(body.toString("utf8"));
        let responseData = {};
        let sessionInfo;
        let session;
        try {
            session = await ServiceManager.GetService(SessionManager).createSession(this.getRemoteAddr(req), userInput);
            if (session.getSessionStatus() === FaucetSessionStatus.FAILED) {
                return {
                    status: FaucetSessionStatus.FAILED,
                    failedCode: session.getSessionData("failed.code"),
                    failedReason: session.getSessionData("failed.reason"),
                    balance: session.getDropAmount().toString(),
                    target: session.getTargetAddr(),
                };
            }
            if (clientVersion)
                session.setSessionData("cliver", clientVersion);
            sessionInfo = await session.getSessionInfo();
        }
        catch (ex) {
            if (ex instanceof FaucetError) {
                let data = {
                    status: FaucetSessionStatus.FAILED,
                    failedCode: ex.getCode(),
                    failedReason: ex.message,
                };
                if (ex.data) {
                    data.failedData = ex.data;
                }
                return data;
            }
            else {
                return {
                    status: FaucetSessionStatus.FAILED,
                    failedCode: "INTERNAL_ERROR",
                    failedReason: ex.toString(),
                };
            }
        }
        return sessionInfo;
    }
    async onGetSession(sessionId) {
        let session;
        if (!sessionId || !(session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]))) {
            return {
                status: "unknown",
                error: "Session not found"
            };
        }
        let sessionInfo;
        try {
            sessionInfo = await session.getSessionInfo();
        }
        catch (ex) {
            if (ex instanceof FaucetError) {
                return {
                    status: FaucetSessionStatus.FAILED,
                    failedCode: ex.getCode(),
                    failedReason: ex.message,
                };
            }
            else {
                return {
                    status: FaucetSessionStatus.FAILED,
                    failedCode: "INTERNAL_ERROR",
                    failedReason: ex.toString(),
                };
            }
        }
        return sessionInfo;
    }
    async onClaimReward(req, body) {
        if (req.method !== "POST")
            return new FaucetHttpResponse(405, "Method Not Allowed");
        let userInput = JSON.parse(body.toString("utf8"));
        let sessionData;
        if (!userInput || !userInput.session || !(sessionData = await ServiceManager.GetService(SessionManager).getSessionData(userInput.session))) {
            return {
                status: FaucetSessionStatus.FAILED,
                failedCode: "INVALID_SESSION",
                failedReason: "Session not found.",
            };
        }
        try {
            await ServiceManager.GetService(EthClaimManager).createSessionClaim(sessionData, userInput);
        }
        catch (ex) {
            return {
                status: FaucetSessionStatus.FAILED,
                failedCode: ex instanceof FaucetError ? ex.getCode() : "",
                failedReason: ex.message,
            };
        }
        return this.getSessionStatus(sessionData, false);
    }
    getSessionStatus(sessionData, details) {
        let sessionStatus = {
            session: sessionData.sessionId,
            status: sessionData.status,
            start: sessionData.startTime,
            tasks: sessionData.tasks,
            balance: sessionData.dropAmount,
            target: sessionData.targetAddr,
        };
        if (sessionData.status === FaucetSessionStatus.FAILED && sessionData.data) {
            sessionStatus.failedCode = sessionData.data['failed.code'];
            sessionStatus.failedReason = sessionData.data['failed.reason'];
        }
        if (sessionData.claim) {
            sessionStatus.claimIdx = sessionData.claim.claimIdx;
            sessionStatus.claimStatus = sessionData.claim.claimStatus;
            sessionStatus.claimBlock = sessionData.claim.txBlock;
            sessionStatus.claimHash = sessionData.claim.txHash;
            sessionStatus.claimMessage = sessionData.claim.txError;
        }
        if (details) {
            sessionStatus.details = {
                data: sessionData.data,
                claim: sessionData.claim,
            };
        }
        return sessionStatus;
    }
    async onGetSessionStatus(sessionId, details) {
        let sessionData;
        if (!sessionId || !(sessionData = await ServiceManager.GetService(SessionManager).getSessionData(sessionId)))
            return new FaucetHttpResponse(404, "Session not found");
        return this.getSessionStatus(sessionData, details);
    }
    async onGetQueueStatus() {
        let now = Math.floor(new Date().getTime() / 1000);
        let cachedRsp, cacheKey = "queue";
        if (!(cachedRsp = this.cachedStatusData[cacheKey]) || cachedRsp.time < now - FAUCETSTATUS_CACHE_TIME) {
            cachedRsp = this.cachedStatusData[cacheKey] = {
                time: now,
                data: buildQueueStatus(),
            };
        }
        return cachedRsp.data;
    }
    async onGetFaucetStatus(key) {
        if (key) {
            if (key !== sha256(faucetConfig.faucetSecret + "-unmasked"))
                return new FaucetHttpResponse(403, "Access denied");
            return Object.assign(await buildFaucetStatus(), buildQueueStatus(true), await buildSessionStatus(true));
        }
        let now = Math.floor(new Date().getTime() / 1000);
        let cachedRsp, cacheKey = "faucet";
        if (!(cachedRsp = this.cachedStatusData[cacheKey]) || cachedRsp.time < now - FAUCETSTATUS_CACHE_TIME) {
            cachedRsp = this.cachedStatusData[cacheKey] = {
                time: now,
                data: Object.assign(await buildFaucetStatus(), buildQueueStatus(), await buildSessionStatus()),
            };
        }
        return cachedRsp.data;
    }
}
//# sourceMappingURL=FaucetWebApi.js.map