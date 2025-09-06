import { FaucetError } from "../common/FaucetError.js";
import { ServiceManager } from "../common/ServiceManager.js";
import { faucetConfig } from "../config/FaucetConfig.js";
import { ModuleHookAction, ModuleManager } from "../modules/ModuleManager.js";
import { FaucetDatabase } from "../db/FaucetDatabase.js";
import { getNewGuid } from "../utils/GuidUtils.js";
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess.js";
import { FaucetStatsLog } from "../services/FaucetStatsLog.js";
export var FaucetSessionStatus;
(function (FaucetSessionStatus) {
    FaucetSessionStatus["UNKNOWN"] = "unknown";
    FaucetSessionStatus["STARTING"] = "starting";
    FaucetSessionStatus["RUNNING"] = "running";
    FaucetSessionStatus["CLAIMABLE"] = "claimable";
    FaucetSessionStatus["CLAIMING"] = "claiming";
    FaucetSessionStatus["FINISHED"] = "finished";
    FaucetSessionStatus["FAILED"] = "failed";
})(FaucetSessionStatus || (FaucetSessionStatus = {}));
export class FaucetSession {
    manager;
    status;
    sessionId;
    startTime;
    targetAddr;
    dropAmount;
    remoteIP;
    blockingTasks = [];
    sessionDataDict = {};
    sessionModuleRefs = {};
    sessionTimer;
    isDirty;
    isSaved;
    isDisposed;
    saveTimer;
    constructor(manager) {
        this.manager = manager;
        this.status = FaucetSessionStatus.UNKNOWN;
        this.isDirty = false;
    }
    async startSession(remoteIP, userInput, overrides) {
        if (this.status !== FaucetSessionStatus.UNKNOWN)
            throw new FaucetError("INVALID_STATE", "cannot start session: session already in '" + this.status + "' state");
        this.status = FaucetSessionStatus.STARTING;
        this.sessionId = getNewGuid();
        this.startTime = Math.floor((new Date()).getTime() / 1000);
        if (remoteIP.match(/^::ffff:/))
            remoteIP = remoteIP.substring(7);
        this.remoteIP = remoteIP;
        this.dropAmount = -1n;
        if (overrides) {
            for (let key in overrides) {
                this.setSessionData(key, overrides[key]);
            }
        }
        try {
            await ServiceManager.GetService(ModuleManager).processActionHooks([
                { prio: 1, hook: () => {
                        if (faucetConfig.denyNewSessions) {
                            let denyMessage = typeof faucetConfig.denyNewSessions === "string" ? faucetConfig.denyNewSessions : "The faucet is currently not allowing new sessions";
                            throw new FaucetError("FAUCET_DISABLED", denyMessage);
                        }
                    } },
                { prio: 5, hook: () => {
                        let targetAddr = this.targetAddr || userInput.addr;
                        if (typeof targetAddr !== "string")
                            throw new FaucetError("INVALID_ADDR", "Missing target address.");
                        if (!targetAddr.match(/^0x[0-9a-fA-F]{40}$/) || targetAddr.match(/^0x0{40}$/i))
                            throw new FaucetError("INVALID_ADDR", "Invalid target address: " + targetAddr);
                        if (!this.targetAddr)
                            this.setTargetAddr(targetAddr);
                    } },
            ], ModuleHookAction.SessionStart, [this, userInput]);
        }
        catch (ex) {
            if (ex instanceof FaucetError)
                await this.setSessionFailed(ex.getCode(), ex.message);
            else
                await this.setSessionFailed("INTERNAL_ERROR", "sessionStart failed: " + ex.toString());
            throw ex;
        }
        if (this.status === FaucetSessionStatus.FAILED)
            return;
        this.status = FaucetSessionStatus.RUNNING;
        this.isDirty = true;
        this.manager.notifySessionUpdate(this);
        await this.tryProceedSession();
        if (this.status === FaucetSessionStatus.RUNNING)
            this.saveSession();
    }
    async restoreSession(sessionData) {
        this.sessionId = sessionData.sessionId;
        this.status = sessionData.status;
        this.startTime = sessionData.startTime;
        this.targetAddr = sessionData.targetAddr;
        this.dropAmount = BigInt(sessionData.dropAmount);
        this.remoteIP = sessionData.remoteIP;
        this.blockingTasks = sessionData.tasks;
        this.sessionDataDict = sessionData.data;
        this.isSaved = true;
        await ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionRestore, [this]);
        this.manager.notifySessionUpdate(this);
        this.resetSessionTimer();
    }
    getStoreData() {
        return {
            sessionId: this.sessionId,
            status: this.status,
            startTime: this.startTime,
            targetAddr: this.targetAddr,
            dropAmount: this.dropAmount.toString(),
            remoteIP: this.remoteIP,
            tasks: this.blockingTasks,
            data: this.sessionDataDict,
            claim: null,
        };
    }
    async saveSession() {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        if (!this.isDirty || this.isDisposed)
            return;
        this.isDirty = false;
        if (this.status === FaucetSessionStatus.FAILED && !this.isSaved)
            return; // simply forget about failed session if they haven't been written to the db yet
        this.isSaved = true;
        await ServiceManager.GetService(FaucetDatabase).updateSession(this.getStoreData());
    }
    lazySaveSession() {
        this.isDirty = true;
        if (this.saveTimer)
            return;
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            this.saveSession();
        }, faucetConfig.sessionSaveTime * 1000);
    }
    async setSessionFailed(code, reason, stack) {
        let oldStatus = this.status;
        this.setSessionData("failed.code", code);
        this.setSessionData("failed.reason", reason);
        this.setSessionData("failed.stack", stack);
        this.status = FaucetSessionStatus.FAILED;
        this.manager.notifySessionUpdate(this);
        this.resetSessionTimer();
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Session " + this.sessionId + " failed: [" + code + "] " + reason);
        if (oldStatus === FaucetSessionStatus.RUNNING)
            ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionComplete, [this]);
        if (this.isSaved)
            await this.saveSession();
        this.isDisposed = true;
    }
    resetSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
        let now = Math.floor((new Date()).getTime() / 1000);
        if (this.status === FaucetSessionStatus.RUNNING) {
            let minTaskTimeout = 0;
            this.blockingTasks.forEach((task) => {
                if (task.timeout > now && (minTaskTimeout === 0 || task.timeout < minTaskTimeout))
                    minTaskTimeout = task.timeout;
            });
            let sessionTimeout = this.startTime + faucetConfig.sessionTimeout;
            let timerDelay = (Math.min(minTaskTimeout, sessionTimeout) - now) + 1;
            if (timerDelay < 1)
                timerDelay = 1;
            this.sessionTimer = setTimeout(() => this.tryProceedSession(), timerDelay * 1000);
        }
    }
    async tryProceedSession() {
        let now = Math.floor((new Date()).getTime() / 1000);
        let sessionTimeout = this.startTime + faucetConfig.sessionTimeout;
        if (this.status === FaucetSessionStatus.RUNNING) {
            if (now >= sessionTimeout) {
                return await this.setSessionFailed("SESSION_TIMEOUT", "session timeout");
            }
            for (let i = this.blockingTasks.length - 1; i >= 0; i--) {
                if (this.blockingTasks[i].timeout > 0 && this.blockingTasks[i].timeout < now) {
                    this.blockingTasks.splice(i, 1);
                }
            }
            if (this.blockingTasks.length === 0) {
                await this.completeSession();
            }
            else {
                this.resetSessionTimer();
            }
        }
    }
    async completeSession() {
        if (this.dropAmount === -1n) {
            await this.addReward(BigInt(faucetConfig.maxDropAmount));
        }
        if (this.dropAmount < BigInt(faucetConfig.minDropAmount)) {
            return await this.setSessionFailed("AMOUNT_TOO_LOW", "drop amount lower than minimum");
        }
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Session " + this.sessionId + " is claimable");
        this.status = FaucetSessionStatus.CLAIMABLE;
        await ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionComplete, [this]);
        ServiceManager.GetService(FaucetStatsLog).addSessionStats(this);
        this.manager.notifySessionUpdate(this);
        this.setSessionData("close.time", Math.floor((new Date()).getTime() / 1000));
        this.saveSession();
        this.isDisposed = true;
    }
    getSessionId() {
        return this.sessionId;
    }
    getSessionStatus() {
        return this.status;
    }
    getStartTime() {
        return this.startTime;
    }
    getRemoteIP() {
        return this.remoteIP;
    }
    async updateRemoteIP(remoteIP) {
        if (remoteIP.match(/^::ffff:/))
            remoteIP = remoteIP.substring(7);
        if (this.remoteIP === remoteIP)
            return;
        let oldRemoteIP = this.remoteIP;
        this.remoteIP = remoteIP;
        try {
            await ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionIpChange, [this]);
        }
        catch (ex) {
            this.remoteIP = oldRemoteIP;
            throw ex;
        }
        await this.saveSession();
    }
    getTargetAddr() {
        return this.targetAddr;
    }
    setTargetAddr(addr) {
        if (this.targetAddr && this.targetAddr !== addr)
            throw new FaucetError("INVALID_STATE", "cannot change target address: already set.");
        this.targetAddr = addr;
    }
    getSessionData(key, defval) {
        return key in this.sessionDataDict ? this.sessionDataDict[key] : defval;
    }
    setSessionData(key, value) {
        this.sessionDataDict[key] = value;
        this.lazySaveSession();
    }
    getSessionModuleRef(key) {
        return this.sessionModuleRefs[key];
    }
    setSessionModuleRef(key, value) {
        this.sessionModuleRefs[key] = value;
    }
    getBlockingTasks() {
        return this.blockingTasks.slice();
    }
    addBlockingTask(moduleName, taskName, timeLimit) {
        this.blockingTasks.push({
            module: moduleName,
            name: taskName,
            timeout: timeLimit ? Math.floor((new Date()).getTime() / 1000) + timeLimit : 0,
        });
        this.resetSessionTimer();
    }
    resolveBlockingTask(moduleName, taskName) {
        for (let i = this.blockingTasks.length - 1; i >= 0; i--) {
            if (this.blockingTasks[i].module === moduleName && this.blockingTasks[i].name === taskName) {
                this.blockingTasks.splice(i, 1);
            }
        }
        this.resetSessionTimer();
        this.lazySaveSession();
    }
    getDropAmount() {
        return this.dropAmount < 0n ? 0n : this.dropAmount;
    }
    setDropAmount(amount) {
        if (this.dropAmount !== -1n)
            return;
        if (this.getSessionStatus() === FaucetSessionStatus.CLAIMING || this.getSessionStatus() === FaucetSessionStatus.FINISHED || this.getSessionStatus() === FaucetSessionStatus.FAILED)
            return 0n;
        this.dropAmount = 0n;
        if (amount > 0n)
            this.addReward(amount);
        else
            this.lazySaveSession();
    }
    async addReward(amount) {
        if (this.getSessionStatus() === FaucetSessionStatus.CLAIMING || this.getSessionStatus() === FaucetSessionStatus.FINISHED || this.getSessionStatus() === FaucetSessionStatus.FAILED)
            return 0n;
        if (typeof amount !== "bigint" || Number.isNaN(amount))
            amount = BigInt(0);
        let rewardFactors = [];
        await ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionRewardFactor, [this, rewardFactors]);
        this.setSessionData("reward.factors", rewardFactors);
        let rewardFactor = 1;
        //console.log(rewardFactors);
        rewardFactors.forEach((factor) => {
            if (!factor || typeof factor.factor !== "number")
                return;
            rewardFactor *= factor?.factor;
        });
        let rewardAmount = amount * BigInt(Math.floor(rewardFactor * 100000)) / 100000n;
        ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionRewarded, [this, rewardAmount, rewardFactors]);
        if (this.getSessionStatus() === FaucetSessionStatus.CLAIMING || this.getSessionStatus() === FaucetSessionStatus.FINISHED || this.getSessionStatus() === FaucetSessionStatus.FAILED)
            return 0n;
        if (this.dropAmount === -1n)
            this.dropAmount = 0n;
        this.dropAmount += rewardAmount;
        this.lazySaveSession();
        return rewardAmount;
    }
    async subPenalty(amount) {
        if (this.status === FaucetSessionStatus.CLAIMING || this.status === FaucetSessionStatus.FINISHED || this.status === FaucetSessionStatus.FAILED)
            return 0n;
        if (this.dropAmount === -1n)
            this.dropAmount = 0n;
        if (amount > this.dropAmount)
            amount = this.dropAmount;
        this.dropAmount -= amount;
        this.lazySaveSession();
        return amount;
    }
    async getSessionInfo() {
        let moduleData = {};
        await ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionInfo, [this, moduleData]);
        let sessionInfo = {
            session: this.getSessionId(),
            status: this.getSessionStatus(),
            start: this.getStartTime(),
            tasks: this.getBlockingTasks(),
            balance: this.getDropAmount().toString(),
            target: this.getTargetAddr(),
            modules: moduleData
        };
        if (this.status === FaucetSessionStatus.FAILED) {
            sessionInfo.failedCode = this.getSessionData("failed.code");
            sessionInfo.failedReason = this.getSessionData("failed.reason");
        }
        return sessionInfo;
    }
}
//# sourceMappingURL=FaucetSession.js.map