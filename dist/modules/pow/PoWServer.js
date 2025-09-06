import { FaucetWorkers } from '../../common/FaucetWorker.js';
import { ServiceManager } from '../../common/ServiceManager.js';
import { PromiseDfd } from '../../utils/PromiseDfd.js';
import { FaucetLogLevel, FaucetProcess } from '../../common/FaucetProcess.js';
import { EthWalletManager } from '../../eth/EthWalletManager.js';
import { ProcessLoadTracker } from '../../utils/ProcessLoadTracker.js';
import { FaucetStatsLog } from '../../services/FaucetStatsLog.js';
export class PoWServer {
    module;
    serverId;
    worker;
    readyDfd;
    shutdownDfd;
    sessions = {};
    constructor(module, serverId, worker) {
        this.module = module;
        this.serverId = serverId;
        this.worker = worker || ServiceManager.GetService(FaucetWorkers).createChildProcess("pow-server");
        this.worker.childProcess.on("message", this.onMessage.bind(this));
        this.worker.childProcess.on("close", () => this.shutdownDfd.resolve());
        this.readyDfd = new PromiseDfd();
        this.shutdownDfd = new PromiseDfd();
    }
    getServerId() {
        return this.serverId;
    }
    sendMessage(message) {
        this.worker.childProcess.send(message);
    }
    onMessage(message, handle) {
        switch (message.action) {
            case "init":
                this.sendMessage({
                    action: "pow-update-config",
                    config: this.module.getModuleConfig(),
                });
                this.readyDfd.resolve();
                ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Started PoW worker process [" + this.serverId + "]");
                break;
            case "pow-session-abort":
                this.onSessionAbort(message.sessionId, message.type, message.reason, message.dirtyProps);
                break;
            case "pow-session-reward":
                this.onSessionReward(message.sessionId, message.reqId, BigInt(message.amount), message.type, message.dirtyProps);
                break;
            case "pow-session-flush":
                this.onSessionFlush(message.sessionId, message.dirtyProps);
                break;
            case "pow-sysload":
                this.onSysLoad(message.cpu, message.memory, message.eventLoopLag, message.activeSessions);
                break;
        }
    }
    async onSessionAbort(sessionId, type, reason, dirtyProps) {
        let session = this.sessions[sessionId];
        if (!session)
            return;
        for (let key in dirtyProps) {
            session.setSessionData(key, dirtyProps[key]);
        }
        let ethWalletManager = ServiceManager.GetService(EthWalletManager);
        switch (type) {
            case "slashed":
                session.setDropAmount(0n);
                session.setSessionFailed("SLASHED", reason);
                ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "session slashed: " + session.getSessionId() + " (" + reason + ") " + ethWalletManager.readableAmount(session.getDropAmount()));
                break;
            case "timeout":
                ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "session idle timeout: " + session.getSessionId() + " (" + reason + ") " + ethWalletManager.readableAmount(session.getDropAmount()));
                break;
            case "closed":
                ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "session client closed: " + session.getSessionId() + " (" + reason + ") " + ethWalletManager.readableAmount(session.getDropAmount()));
                break;
        }
        this.module.processPoWSessionClose(session);
        let sessionInfo = await session.getSessionInfo();
        this.sendMessage({
            action: "pow-session-close",
            sessionId: sessionId,
            info: sessionInfo,
        });
    }
    onSessionReward(sessionId, reqId, amount, type, dirtyProps) {
        let session = this.sessions[sessionId];
        if (!session)
            return;
        for (let key in dirtyProps) {
            session.setSessionData(key, dirtyProps[key]);
        }
        let rewardPromise;
        if (amount < 0n) {
            rewardPromise = session.subPenalty(amount * -1n).then((amount) => {
                return amount * -1n;
            });
        }
        else {
            rewardPromise = session.addReward(amount);
        }
        rewardPromise.then((amount) => {
            let faucetStats = ServiceManager.GetService(FaucetStatsLog);
            switch (type) {
                case "verify":
                    if (amount > 0n) {
                        faucetStats.statVerifyReward += amount;
                        faucetStats.statVerifyCount++;
                    }
                    else {
                        faucetStats.statVerifyPenalty += amount;
                        faucetStats.statVerifyMisses++;
                    }
                    break;
                case "share":
                    faucetStats.statShareRewards += amount;
                    faucetStats.statShareCount++;
                    break;
            }
            let balance = session.getDropAmount().toString();
            this.sendMessage({
                action: "pow-session-reward",
                sessionId: sessionId,
                reqId: reqId,
                amount: amount.toString(),
                balance: balance,
            });
        });
    }
    onSessionFlush(sessionId, dirtyProps) {
        let session = this.sessions[sessionId];
        if (!session)
            return;
        for (let key in dirtyProps) {
            session.setSessionData(key, dirtyProps[key]);
        }
    }
    getSessionCount() {
        return Object.keys(this.sessions).length;
    }
    getReadyPromise() {
        return this.readyDfd.promise;
    }
    async shutdown() {
        this.sendMessage({
            action: "pow-shutdown",
        });
        let shutdownTimeout = setTimeout(() => {
            this.worker.childProcess.kill();
        }, 5000);
        await this.shutdownDfd.promise;
        clearTimeout(shutdownTimeout);
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Stopped PoW worker process [" + this.serverId + "]");
    }
    updateConfig(config) {
        this.sendMessage({
            action: "pow-update-config",
            config: config,
        });
    }
    async registerSession(session) {
        let sessionId = session.getSessionId();
        this.sessions[sessionId] = session;
        await this.getReadyPromise();
        this.sendMessage({
            action: "pow-register-session",
            sessionId: sessionId,
            data: {
                "_startTime": session.getStartTime(),
                "_balance": session.getDropAmount().toString(),
                "pow.idleTime": session.getSessionData("pow.idleTime"),
                "pow.lastNonce": session.getSessionData("pow.lastNonce"),
                "pow.shareCount": session.getSessionData("pow.shareCount"),
                "pow.hashrates": session.getSessionData("pow.hashrates"),
                "pow.hashrate": session.getSessionData("pow.hashrate"),
                "pow.preimage": session.getSessionData("pow.preimage"),
            }
        });
    }
    destroySession(sessionId, failed) {
        let session = this.sessions[sessionId];
        if (!session)
            return;
        this.sendMessage({
            action: "pow-destroy-session",
            sessionId: sessionId,
            failed: failed,
        });
        delete this.sessions[sessionId];
    }
    async connect(sessionId, req, socket, head) {
        socket.pause();
        socket.removeAllListeners();
        await this.readyDfd.promise;
        this.worker.childProcess.send({
            action: "pow-connect",
            sessionId: sessionId,
            url: req.url,
            method: req.method,
            headers: req.headers,
            head: head.toString('base64'),
        }, socket, {
            keepOpen: true
        });
        setTimeout(() => {
            socket.destroy();
        }, 100);
    }
    onSysLoad(cpu, memory, eventLoopLag, activeSessions) {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, ProcessLoadTracker.formatLoadStats(`PoW server [${this.serverId}]`, { timestamp: Math.floor(Date.now() / 1000), cpu, eventLoopLag, memory }, { Sessions: `${activeSessions.length}/${this.getSessionCount()}` }));
        for (let sessionId in this.sessions) {
            let session = this.sessions[sessionId];
            if (!session)
                continue;
            session.setSessionModuleRef("pow.clientActive", activeSessions.indexOf(sessionId) > -1);
        }
    }
}
//# sourceMappingURL=PoWServer.js.map