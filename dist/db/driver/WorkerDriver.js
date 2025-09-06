import { BaseDriver } from "./BaseDriver.js";
import { PromiseDfd } from "../../utils/PromiseDfd.js";
export class WorkerDriver extends BaseDriver {
    port;
    reqDict = {};
    reqIdx = 1;
    readyDfd;
    constructor(port) {
        super();
        this.port = port;
        this.readyDfd = new PromiseDfd();
        this.port.on("message", (msg) => this.onWorkerMessage(msg));
    }
    sendRequest(cmd, args) {
        return this.readyDfd.promise.then(() => {
            let reqIdx = this.reqIdx++;
            let resDfd = this.reqDict[reqIdx] = new PromiseDfd();
            this.port.postMessage({
                req: reqIdx,
                cmd: cmd,
                args: args,
            });
            return resDfd.promise;
        });
    }
    onWorkerMessage(msg) {
        if (msg.cmd === "init") {
            this.readyDfd.resolve();
            return;
        }
        if (!msg.req)
            return;
        let reqDfd = this.reqDict[msg.req];
        if (!reqDfd)
            return;
        delete this.reqDict[msg.req];
        if (msg.hasOwnProperty("result"))
            reqDfd.resolve(msg.result);
        else
            reqDfd.reject(msg.error);
    }
    async open(options) {
        return this.sendRequest("open", [options]);
    }
    async close() {
        return this.sendRequest("close", []);
    }
    async exec(sql) {
        return this.sendRequest("exec", [sql]);
    }
    async run(sql, values) {
        return this.sendRequest("run", [sql, values]);
    }
    async all(sql, values) {
        return this.sendRequest("all", [sql, values]);
    }
    async get(sql, values) {
        return this.sendRequest("get", [sql, values]);
    }
}
//# sourceMappingURL=WorkerDriver.js.map