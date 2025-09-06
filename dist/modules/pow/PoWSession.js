import { PromiseDfd } from "../../utils/PromiseDfd.js";
export class PoWSession {
    sessionId;
    worker;
    sessionData = {};
    currentActiveClient;
    verifyStats = { missed: 0, pending: 0 };
    balance = BigInt(0);
    rewardCounter = 0;
    rewardDfds = {};
    sessionCloseDfd;
    constructor(sessionId, worker) {
        this.sessionId = sessionId;
        this.worker = worker;
    }
    getSessionId() {
        return this.sessionId;
    }
    getWorker() {
        return this.worker;
    }
    loadSessionData(data) {
        for (let key in data) {
            if (key === "_balance")
                this.balance = BigInt(data[key]);
            else
                this.sessionData[key] = {
                    value: data[key],
                    dirty: false
                };
        }
    }
    getSessionProp(key) {
        return this.sessionData[key]?.value;
    }
    setSessionProp(key, value) {
        if (this.sessionData[key] && this.sessionData[key].value === value)
            return;
        this.sessionData[key] = {
            value: value,
            dirty: true
        };
    }
    getDropAmount() {
        return this.balance;
    }
    async subPenalty(amount, type) {
        return this.addReward(amount * -1n, type);
    }
    async addReward(amount, type) {
        let dirtyProps = this.getDirtyProps(true);
        let reqId = this.rewardCounter++;
        this.worker.sendSessionReward(this.sessionId, reqId, amount, type, dirtyProps);
        this.rewardDfds[reqId] = new PromiseDfd();
        return this.rewardDfds[reqId].promise.then((res) => {
            let amount = res[0];
            let balance = res[1];
            this.balance = balance;
            return amount;
        });
    }
    processReward(reqId, amount, balance) {
        let dfd = this.rewardDfds[reqId];
        if (dfd) {
            dfd.resolve([amount, balance]);
            delete this.rewardDfds[reqId];
        }
    }
    get startTime() {
        return this.getSessionProp("_startTime");
    }
    get activeClient() {
        return this.currentActiveClient;
    }
    set activeClient(value) {
        this.currentActiveClient = value;
        if (value)
            this.setSessionProp("pow.idleTime", null);
        else
            this.setSessionProp("pow.idleTime", Math.floor(new Date().getTime() / 1000));
    }
    get idleTime() {
        return this.getSessionProp("pow.idleTime");
    }
    get idleTimer() {
        return this.getSessionProp("pow.idleTimer");
    }
    set idleTimer(value) {
        this.setSessionProp("pow.idleTimer", value);
    }
    get lastNonce() {
        return this.getSessionProp("pow.lastNonce") || 0;
    }
    set lastNonce(value) {
        this.setSessionProp("pow.lastNonce", value);
    }
    get shareCount() {
        return this.getSessionProp("pow.shareCount") || 0;
    }
    set shareCount(value) {
        this.setSessionProp("pow.shareCount", value);
    }
    get missedVerifications() {
        return this.verifyStats.missed;
    }
    set missedVerifications(value) {
        this.verifyStats.missed = value;
    }
    get pendingVerifications() {
        return this.verifyStats.pending;
    }
    set pendingVerifications(value) {
        this.verifyStats.pending = value;
    }
    get reportedHashrate() {
        return this.getSessionProp("pow.hashrates") || [];
    }
    set reportedHashrate(value) {
        let avgCount = 0;
        let avgSum = 0;
        value.forEach((val) => {
            avgCount++;
            avgSum += val;
        });
        this.setSessionProp("pow.hashrates", value);
        this.setSessionProp("pow.hashrate", avgSum / avgCount);
    }
    get preImage() {
        return this.getSessionProp("pow.preimage") || null;
    }
    set preImage(value) {
        this.setSessionProp("pow.preimage", value);
    }
    getDirtyProps(reset = true) {
        let dirtyProps = {};
        for (let key in this.sessionData) {
            if (this.sessionData[key].dirty) {
                dirtyProps[key] = this.sessionData[key].value;
                if (reset)
                    this.sessionData[key].dirty = false;
            }
        }
        return dirtyProps;
    }
    slashSession(reason) {
        return this.closeSession("slashed", reason);
    }
    async closeSession(type, reason) {
        if (this.sessionCloseDfd)
            return this.sessionCloseDfd.promise;
        this.sessionCloseDfd = new PromiseDfd();
        let dirtyProps = this.getDirtyProps(true);
        this.worker.sendSessionAbort(this.sessionId, type || "closed", reason || "", dirtyProps);
        return this.sessionCloseDfd.promise;
    }
    processSessionClose(info) {
        if (this.sessionCloseDfd) {
            this.sessionCloseDfd.resolve(info);
        }
    }
}
//# sourceMappingURL=PoWSession.js.map