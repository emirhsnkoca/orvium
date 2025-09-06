import assert from 'node:assert';
import { base64ToHex } from "../../../utils/ConvertHelpers.js";
import { PoWHashAlgo } from '../PoWConfig.js';
export class PoWValidatorWorker {
    hashFn = {};
    port;
    difficultyMasks = {};
    constructor(port) {
        this.port = port;
        this.port.on("message", (evt) => this.onControlMessage(evt));
        this.port.postMessage({ action: "init" });
    }
    getHashFn(algo) {
        let algoKey = algo.toString();
        if (this.hashFn[algoKey])
            return this.hashFn[algoKey];
        else
            return this.hashFn[algoKey] = this.initHashFn(algo);
    }
    async initHashFn(algo) {
        let hashFn;
        switch (algo) {
            case PoWHashAlgo.SCRYPT:
                hashFn = await (async () => {
                    let module = await import("../../../../libs/scrypt_wasm.cjs");
                    await module.default.getScryptReadyPromise();
                    let scrypt = module.default.getScrypt();
                    return (nonce, preimg, params) => {
                        return scrypt(nonce, preimg, params.cpuAndMemory, params.blockSize, params.parallelization, params.keyLength);
                    };
                })();
                break;
            case PoWHashAlgo.CRYPTONIGHT:
                hashFn = await (async () => {
                    let module = await import("../../../../libs/cryptonight_wasm.cjs");
                    await module.default.getCryptoNightReadyPromise();
                    let cryptonight = module.default.getCryptoNight();
                    return (nonce, preimg, params) => {
                        return cryptonight(preimg + nonce, params.algo, params.variant, params.height);
                    };
                })();
                break;
            case PoWHashAlgo.ARGON2:
                hashFn = await (async () => {
                    let module = await import("../../../../libs/argon2_wasm.cjs");
                    await module.default.getArgon2ReadyPromise();
                    let argon2 = module.default.getArgon2();
                    return (nonce, preimg, params) => {
                        return argon2(nonce, preimg, params.keyLength, params.timeCost, params.memoryCost, params.parallelization, params.type, params.version);
                    };
                })();
                break;
            case PoWHashAlgo.NICKMINER:
                hashFn = await (async () => {
                    let module = await import("../../../../libs/nickminer_wasm.cjs");
                    await module.default.getNickMinerReadyPromise();
                    let nickMiner = module.default.getNickMiner();
                    return (nonce, preimg, params) => {
                        nickMiner.miner_set_config(params.hash, params.sigR, params.sigV, params.suffix, params.prefix, params.count, preimg);
                        return nickMiner.miner_run(nonce);
                    };
                })();
                break;
        }
        return hashFn;
    }
    onControlMessage(msg) {
        assert.equal(msg && (typeof msg === "object"), true);
        //console.log(evt);
        switch (msg.action) {
            case "validate":
                this.onCtrlValidate(msg.data);
                break;
        }
    }
    getDifficultyMask(difficulty) {
        let byteCount = Math.floor(difficulty / 8) + 1;
        let bitCount = difficulty - ((byteCount - 1) * 8);
        let maxValue = Math.pow(2, 8 - bitCount);
        let mask = maxValue.toString(16);
        while (mask.length < byteCount * 2) {
            mask = "0" + mask;
        }
        return mask;
    }
    async onCtrlValidate(req) {
        let hashFn = await this.getHashFn(req.algo);
        let preimg = base64ToHex(req.preimage);
        let dmask = this.difficultyMasks[req.difficulty];
        if (!dmask)
            dmask = this.difficultyMasks[req.difficulty] = this.getDifficultyMask(req.difficulty);
        let isValid = true;
        let nonceHex = req.nonce?.toString(16) || "";
        if (nonceHex.length < 16) {
            nonceHex = "0000000000000000".substring(0, 16 - nonceHex.length) + nonceHex;
        }
        let hashHex = hashFn(nonceHex, preimg, req.params);
        if (req.algo === PoWHashAlgo.NICKMINER) {
            if (hashHex.substring(0, 2) != "0x" || parseInt(hashHex.substring(2, 4), 16) < req.difficulty || hashHex != req.data) {
                isValid = false;
            }
        }
        else {
            let startOfHash = hashHex.substring(0, dmask.length);
            if (!(startOfHash <= dmask)) {
                isValid = false;
            }
        }
        this.port.postMessage({
            action: "validated",
            data: {
                shareId: req.shareId,
                isValid: isValid
            }
        });
    }
}
//# sourceMappingURL=PoWValidatorWorker.js.map