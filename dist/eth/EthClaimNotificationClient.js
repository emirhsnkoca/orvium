import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess.js";
import { ServiceManager } from "../common/ServiceManager.js";
export class EthClaimNotificationClient {
    static cfgPingInterval = 30;
    static cfgPingTimeout = 120;
    static activeClients = [];
    static lastNotificationData;
    static broadcastClaimNotification(data) {
        this.lastNotificationData = data;
        for (let i = this.activeClients.length - 1; i >= 0; i--) {
            this.activeClients[i].sendClaimNotification(data);
        }
    }
    static resetClaimNotification() {
        this.lastNotificationData = null;
    }
    socket;
    pingTimer = null;
    lastPingPong;
    claimIdx;
    constructor(socket, claimIdx) {
        this.socket = socket;
        this.claimIdx = claimIdx;
        this.lastPingPong = new Date();
        this.socket.on("ping", (data) => {
            this.lastPingPong = new Date();
            this.socket?.pong(data);
        });
        this.socket.on("pong", (data) => {
            this.lastPingPong = new Date();
        });
        this.socket.on("error", (err) => {
            ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "WebSocket error: " + err.toString());
            try {
                this.socket?.close();
            }
            catch (ex) { }
            this.dispose();
        });
        this.socket.on("close", () => {
            this.dispose();
        });
        this.pingClientLoop();
        EthClaimNotificationClient.activeClients.push(this);
        if (EthClaimNotificationClient.lastNotificationData) {
            this.sendClaimNotification(EthClaimNotificationClient.lastNotificationData);
        }
    }
    dispose() {
        this.socket = null;
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        let clientIdx = EthClaimNotificationClient.activeClients.indexOf(this);
        if (clientIdx !== -1) {
            EthClaimNotificationClient.activeClients.splice(clientIdx, 1);
        }
    }
    killClient(reason) {
        try {
            this.sendMessage("error", {
                reason: reason,
            });
            this.socket?.close();
        }
        catch (ex) { }
        this.dispose();
    }
    pingClientLoop() {
        this.pingTimer = setInterval(() => {
            let pingpongTime = Math.floor(((new Date()).getTime() - this.lastPingPong.getTime()) / 1000);
            if (pingpongTime > EthClaimNotificationClient.cfgPingTimeout) {
                this.killClient("ping timeout");
                return;
            }
            this.socket?.ping();
        }, EthClaimNotificationClient.cfgPingInterval * 1000);
    }
    sendMessage(action, data) {
        this.socket?.send(JSON.stringify({
            action: action,
            data: data,
        }));
    }
    sendClaimNotification(data) {
        this.sendMessage("update", data);
        if (data.confirmedIdx >= this.claimIdx) {
            this.killClient("claim confirmed");
        }
    }
}
//# sourceMappingURL=EthClaimNotificationClient.js.map