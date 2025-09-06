import fs from "fs";
import { ServiceManager } from "../../common/ServiceManager.js";
import { getNewGuid } from "../../utils/GuidUtils.js";
import { PromiseDfd } from "../../utils/PromiseDfd.js";
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess.js";
import { PoWHashAlgo } from "./PoWConfig.js";
import { resolveRelativePath } from "../../config/FaucetConfig.js";
export class PoWShareVerification {
    static verifyingShares = {};
    static processVerificationResult(shareId, verifier, isValid) {
        if (!this.verifyingShares[shareId])
            return false;
        return this.verifyingShares[shareId].processVerificationResult(verifier, isValid);
    }
    shareId;
    server;
    session;
    nonce;
    data;
    verifyLocal = false;
    verifyMinerCount = 0;
    verifyMinerSessions = [];
    verifyMinerResults = {};
    verifyMinerTimer;
    isInvalid = false;
    resultDfd;
    constructor(server, session, nonce, data) {
        this.shareId = getNewGuid();
        this.server = server;
        this.session = session;
        this.nonce = nonce;
        this.data = data;
        PoWShareVerification.verifyingShares[this.shareId] = this;
    }
    getMinerVerifyCount() {
        return this.verifyMinerCount;
    }
    getMinerVerifyMisses() {
        return this.verifyMinerCount - Object.keys(this.verifyMinerResults).length;
    }
    startVerification() {
        if (this.resultDfd)
            return this.resultDfd.promise;
        this.resultDfd = new PromiseDfd();
        let powConfig = this.server.getModuleConfig();
        let validatorSessions = this.getVerifierSessions();
        let verifyLocalPercent = powConfig.verifyLocalPercent;
        if (validatorSessions.length < powConfig.verifyMinerPeerCount && powConfig.verifyLocalLowPeerPercent > verifyLocalPercent)
            verifyLocalPercent = powConfig.verifyLocalLowPeerPercent;
        this.verifyLocal = (Math.floor(Math.random() * 100) < verifyLocalPercent);
        if (this.verifyLocal && this.server.getValidator().getValidationQueueLength() >= powConfig.verifyLocalMaxQueue)
            this.verifyLocal = false;
        if (this.verifyLocal) {
            // verify locally
            this.server.getValidator().validateShare(this.shareId, this.nonce, this.session.preImage, this.data).then((isValid) => {
                if (!isValid)
                    this.isInvalid = true;
                this.completeVerification();
            });
        }
        else if (powConfig.verifyMinerPercent > 0 && validatorSessions.length >= powConfig.verifyMinerPeerCount && (Math.floor(Math.random() * 100) < powConfig.verifyMinerPercent)) {
            // redistribute to validators for verification
            this.verifyMinerCount = powConfig.verifyMinerIndividuals;
            for (let i = 0; i < this.verifyMinerCount; i++) {
                let randSessIdx = Math.floor(Math.random() * validatorSessions.length);
                let validatorSession = validatorSessions.splice(randSessIdx, 1)[0];
                this.verifyMinerSessions.push(validatorSession.getSessionId());
                validatorSession.pendingVerifications++;
                validatorSession.activeClient.sendMessage("verify", {
                    shareId: this.shareId,
                    preimage: this.session.preImage,
                    nonce: this.nonce,
                    data: this.data,
                });
            }
            this.verifyMinerTimer = setTimeout(() => {
                this.verifyMinerTimer = null;
                this.completeVerification();
            }, powConfig.verifyMinerTimeout * 1000);
        }
        else {
            // no verification - just accept
            this.completeVerification();
        }
        return this.resultDfd.promise;
    }
    getVerifierSessions() {
        let powConfig = this.server.getModuleConfig();
        let minBalance = BigInt(powConfig.powShareReward) * BigInt(powConfig.verifyMinerMissPenaltyPerc * 100) / 10000n;
        let activeClients = this.server.getActiveClients();
        return activeClients.map((client) => client.getPoWSession()).filter((session, index) => {
            if (!session.activeClient) {
                ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "PoWModule.getActiveClients returned a inactive client: " + session.getSessionId());
                return false;
            }
            return (session !== this.session &&
                session.getDropAmount() >= minBalance &&
                session.missedVerifications < powConfig.verifyMinerMaxMissed &&
                session.pendingVerifications < powConfig.verifyMinerMaxPending);
        });
    }
    processVerificationResult(verifier, isValid) {
        let validatorIdx = this.verifyMinerSessions.indexOf(verifier);
        if (validatorIdx === -1)
            return false;
        this.verifyMinerSessions.splice(validatorIdx, 1);
        this.verifyMinerResults[verifier] = isValid;
        if (!isValid)
            this.isInvalid = true;
        if (this.verifyMinerSessions.length === 0)
            setTimeout(() => this.completeVerification(), 0);
        return true;
    }
    completeVerification() {
        let powConfig = this.server.getModuleConfig();
        if (this.verifyMinerTimer) {
            clearTimeout(this.verifyMinerTimer);
            this.verifyMinerTimer = null;
        }
        if (this.isInvalid && !this.verifyLocal) {
            // always verify invalid shares locally
            this.verifyLocal = true;
            this.server.getValidator().validateShare(this.shareId, this.nonce, this.session.preImage, this.data).then((isValid) => {
                if (isValid)
                    this.isInvalid = false;
                this.completeVerification();
            });
            return;
        }
        delete PoWShareVerification.verifyingShares[this.shareId];
        if (this.verifyMinerSessions.length > 0) {
            // penalty for missed verification requests
            this.verifyMinerSessions.forEach((verifierId) => {
                let session = this.server.getPoWSession(verifierId);
                if (!session)
                    return;
                session.pendingVerifications--;
                session.missedVerifications++;
                let missPenalty = BigInt(powConfig.powShareReward) * BigInt(powConfig.verifyMinerMissPenaltyPerc * 100) / 10000n;
                session.subPenalty(missPenalty, "verify").then((penalty) => {
                    if (penalty != 0n) {
                        let client;
                        if ((client = session.activeClient)) {
                            client.sendMessage("updateBalance", {
                                balance: session.getDropAmount().toString(),
                                reason: "verify miss (penalty: " + missPenalty.toString() + ")"
                            });
                        }
                    }
                });
            });
        }
        Object.keys(this.verifyMinerResults).forEach((verifierId) => {
            let session = this.server.getPoWSession(verifierId);
            if (session) {
                session.pendingVerifications--;
                if (this.verifyMinerResults[verifierId] !== !this.isInvalid)
                    session.slashSession("invalid PoW verification result");
            }
        });
        let shareReward;
        if (this.isInvalid) {
            this.session.slashSession("invalid PoW result hash");
            shareReward = Promise.resolve(0n);
        }
        else {
            // valid share - add rewards
            shareReward = this.session.addReward(BigInt(powConfig.powShareReward), "share");
        }
        if (powConfig.powHashAlgo === PoWHashAlgo.NICKMINER && powConfig.powNickMinerParams.relevantFile) {
            // check for relevant results
            let difficulty = parseInt(this.data.substring(2, 4), 16);
            if (difficulty >= powConfig.powNickMinerParams.relevantDifficulty) {
                let line = "0x" + this.data.substring(4, 44) + "  (d: " + difficulty + "): hash: 0x" + powConfig.powNickMinerParams.hash + ", sigR: 0x" + powConfig.powNickMinerParams.sigR + ", sigS: 0x" + this.data.substring(44, this.data.length);
                fs.appendFileSync(resolveRelativePath(powConfig.powNickMinerParams.relevantFile), line + "\n");
            }
        }
        shareReward.then((amount) => {
            this.session.activeClient?.sendMessage("updateBalance", {
                balance: this.session.getDropAmount().toString(),
                reason: "valid share (reward: " + amount.toString() + ")"
            });
            this.resultDfd.resolve({
                isValid: !this.isInvalid,
                reward: amount
            });
        });
    }
}
//# sourceMappingURL=PoWShareVerification.js.map