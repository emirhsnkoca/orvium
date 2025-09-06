import assert from 'node:assert';
// @ts-ignore
import vkey from "./circuit.json" with { type: "json" };
export class ZupassWorker {
    port;
    groth16;
    constructor(port) {
        this.port = port;
        this.port.on("message", (evt) => this.onControlMessage(evt));
        this.initLibrary().then(() => {
            this.port.postMessage({ action: "init" });
        }, (err) => {
            this.port.postMessage({ action: "error" });
        });
    }
    async initLibrary() {
        let module = await import("../../../libs/groth16.cjs");
        if (module.default) {
            module = module.default;
        }
        await module.init();
        this.groth16 = module.groth16;
    }
    onControlMessage(msg) {
        assert.equal(msg && (typeof msg === "object"), true);
        //console.log(evt);
        switch (msg.action) {
            case "verify":
                this.onCtrlVerify(msg.data);
                break;
        }
    }
    async onCtrlVerify(req) {
        return this.groth16.verify(vkey, {
            publicSignals: req.publicSignals,
            proof: req.proof
        }).catch((ex) => {
            console.error(ex);
            return false;
        }).then((res) => {
            this.port.postMessage({
                action: "verified",
                data: {
                    reqId: req.reqId,
                    isValid: res
                }
            });
        });
    }
}
//# sourceMappingURL=ZupassWorker.js.map