import { Worker, parentPort, workerData } from "node:worker_threads";
import { fork } from "node:child_process";
import { DatabaseWorker } from "../db/DatabaseWorker.js";
import { PoWServerWorker } from "../modules/pow/PoWServerWorker.js";
import { PoWValidatorWorker } from "../modules/pow/validator/PoWValidatorWorker.js";
import { ZupassWorker } from "../modules/zupass/ZupassWorker.js";
class TestWorker {
    constructor(port) {
        if (port) {
            port.postMessage({ action: "test" });
        }
        else if (process.send) {
            process.send({ action: "test" });
        }
    }
}
const WORKER_CLASSES = {
    "test": TestWorker,
    "database": DatabaseWorker,
    "pow-server": PoWServerWorker,
    "pow-validator": PoWValidatorWorker,
    "zupass-worker": ZupassWorker,
};
export class FaucetWorkers {
    static loadWorkerClass(workerClassKey, workerPort) {
        let workerClass = WORKER_CLASSES[workerClassKey || workerData?.classKey];
        return new workerClass(workerPort || parentPort);
    }
    initialized;
    workerSrc;
    initialize(workerSrc) {
        if (this.initialized)
            return;
        this.initialized = true;
        this.workerSrc = workerSrc;
    }
    createWorker(classKey) {
        if (!WORKER_CLASSES[classKey])
            throw "unknown worker class-key '" + classKey + "'";
        let worker = new Worker(this.workerSrc, {
            workerData: {
                classKey: classKey,
            },
        });
        return worker;
    }
    createChildProcess(classKey) {
        if (!WORKER_CLASSES[classKey])
            throw "unknown worker class-key '" + classKey + "'";
        let controller = new AbortController();
        let childProcess = fork(this.workerSrc, ["worker", classKey], {
            signal: controller.signal,
        });
        return {
            childProcess: childProcess,
            controller: controller,
        };
    }
}
//# sourceMappingURL=FaucetWorker.js.map