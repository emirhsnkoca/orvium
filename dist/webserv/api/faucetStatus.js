import { ServiceManager } from "../../common/ServiceManager.js";
import { faucetConfig } from "../../config/FaucetConfig.js";
import { FaucetDatabase } from "../../db/FaucetDatabase.js";
import { EthClaimManager } from "../../eth/EthClaimManager.js";
import { EthWalletManager } from "../../eth/EthWalletManager.js";
import { EthWalletRefill } from "../../eth/EthWalletRefill.js";
import { ModuleManager } from "../../modules/ModuleManager.js";
import { SessionManager } from "../../session/SessionManager.js";
import { getHashedIp, getHashedSessionId } from "../../utils/HashedInfo.js";
export async function buildFaucetStatus() {
    let moduleManager = ServiceManager.GetService(ModuleManager);
    let sessionManager = ServiceManager.GetService(SessionManager);
    let ethClaimManager = ServiceManager.GetService(EthClaimManager);
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let ethWalletRefill = ServiceManager.GetService(EthWalletRefill);
    let statusRsp = {
        status: {
            walletBalance: ethWalletManager.getFaucetBalance()?.toString(),
            unclaimedBalance: (await sessionManager.getUnclaimedBalance()).toString(),
            queuedBalance: ethClaimManager.getQueuedAmount().toString(),
            balanceRestriction: moduleManager.getModule("faucet-balance")?.getBalanceRestriction() || 100,
        },
        outflowRestriction: moduleManager.getModule("faucet-outflow")?.getOutflowDebugState(),
        refill: faucetConfig.ethRefillContract && faucetConfig.ethRefillContract.contract ? {
            balance: (await ethWalletManager.getWalletBalance(faucetConfig.ethRefillContract.contract)).toString(),
            trigger: faucetConfig.ethRefillContract.triggerBalance.toString(),
            amount: faucetConfig.ethRefillContract.requestAmount.toString(),
            cooldown: ethWalletRefill.getFaucetRefillCooldown(),
        } : null,
    };
    return statusRsp;
}
export async function buildSessionStatus(unmasked) {
    let sessionsRsp = {
        sessions: null,
    };
    let sessions = await ServiceManager.GetService(FaucetDatabase).getAllSessions(86400);
    let sessionManager = ServiceManager.GetService(SessionManager);
    sessionsRsp.sessions = sessions.map((session) => {
        let runningSession = sessionManager.getSession(session.sessionId);
        return {
            id: unmasked ? session.sessionId : getHashedSessionId(session.sessionId, faucetConfig.faucetSecret),
            start: session.startTime,
            target: session.targetAddr,
            ip: unmasked ? session.remoteIP : getHashedIp(session.remoteIP, faucetConfig.faucetSecret),
            ipInfo: session.data["ipinfo.data"],
            balance: session.dropAmount,
            nonce: session.data["pow.lastNonce"],
            hashrate: session.data["pow.hashrate"],
            status: session.status,
            restr: session.data["ipinfo.restriction.data"],
            cliver: session.data["cliver"],
            boost: session.data["passport.score"],
            connected: runningSession ? !!runningSession.getSessionModuleRef("pow.clientActive") : null,
            idle: session.data["pow.idleTime"],
            factors: session.data["reward.factors"],
        };
    });
    return sessionsRsp;
}
export function buildQueueStatus(unmasked) {
    let claims = ServiceManager.GetService(EthClaimManager).getTransactionQueue();
    let rspClaims = claims.map((claimTx) => {
        return {
            time: claimTx.claim.claimTime,
            session: unmasked ? claimTx.session : getHashedSessionId(claimTx.session, faucetConfig.faucetSecret),
            target: claimTx.target,
            amount: claimTx.amount.toString(),
            status: claimTx.claim.claimStatus,
            error: claimTx.claim.txError,
            nonce: claimTx.claim.txNonce || null,
            hash: claimTx.claim.txHash || null,
            txhex: claimTx.claim.txHex || null,
        };
    });
    return {
        claims: rspClaims,
    };
}
//# sourceMappingURL=faucetStatus.js.map