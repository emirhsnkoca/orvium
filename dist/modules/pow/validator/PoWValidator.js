import assert from 'node:assert';
import { FaucetWorkers } from '../../../common/FaucetWorker.js';
import { ServiceManager } from '../../../common/ServiceManager.js';
import { PromiseDfd } from '../../../utils/PromiseDfd.js';
import { PoWHashAlgo } from '../PoWConfig.js';
export class PoWValidator {
    server;
    worker;
    readyDfd;
    validateQueue = {};
    constructor(module, worker) {
        this.server = module;
        this.readyDfd = new PromiseDfd();
        this.worker = worker || ServiceManager.GetService(FaucetWorkers).createWorker("pow-validator");
        this.worker.on("message", (msg) => this.onWorkerMessage(msg));
    }
    dispose() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
    getValidationQueueLength() {
        return Object.keys(this.validateQueue).length;
    }
    validateShare(shareId, nonce, preimg, data) {
        let resDfd = new PromiseDfd();
        let config = this.server.getModuleConfig();
        let req = {
            shareId: shareId,
            nonce: nonce,
            data: data,
            preimage: preimg,
            algo: config.powHashAlgo,
            params: (() => {
                switch (config.powHashAlgo) {
                    case PoWHashAlgo.SCRYPT:
                        return config.powScryptParams;
                    case PoWHashAlgo.CRYPTONIGHT:
                        return config.powCryptoNightParams;
                    case PoWHashAlgo.ARGON2:
                        return config.powArgon2Params;
                    case PoWHashAlgo.NICKMINER:
                        return config.powNickMinerParams;
                }
            })(),
            difficulty: config.powDifficulty,
        };
        this.validateQueue[req.shareId] = resDfd;
        this.readyDfd.promise.then(() => {
            this.worker.postMessage({
                action: "validate",
                data: req
            });
        });
        return resDfd.promise;
    }
    onWorkerMessage(msg) {
        assert.equal(msg && (typeof msg === "object"), true);
        switch (msg.action) {
            case "init":
                this.readyDfd.resolve();
                break;
            case "validated":
                this.onWorkerValidated(msg.data);
                break;
        }
    }
    onWorkerValidated(msg) {
        assert.equal(this.validateQueue.hasOwnProperty(msg.shareId), true);
        let resDfd = this.validateQueue[msg.shareId];
        delete this.validateQueue[msg.shareId];
        resDfd.resolve(msg.isValid);
    }
}
//# sourceMappingURL=PoWValidator.js.map