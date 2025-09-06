import assert from 'node:assert';
import JSONBig from "json-bigint";
import { faucetConfig } from "../../config/FaucetConfig.js";
import { decryptStr, encryptStr } from "../../utils/CryptoUtils.js";
import { BABY_JUB_NEGATIVE_ONE, booleanToBigInt, generateSnarkMessageHash, hexToBigInt, numberToBigInt, requireDefinedParameter, uuidToBigInt } from './ZupassUtils.js';
import { PromiseDfd } from "../../utils/PromiseDfd.js";
import { ServiceManager } from "../../common/ServiceManager.js";
import { FaucetWorkers } from "../../common/FaucetWorker.js";
/**
 * Max supported size of validEventIds field in ZKEdDSAEventTicketPCDArgs.
 */
export const VALID_EVENT_IDS_MAX_LEN = 20;
export const STATIC_TICKET_PCD_NULLIFIER = generateSnarkMessageHash("dummy-nullifier-for-eddsa-event-ticket-pcds");
export var TicketCategory;
(function (TicketCategory) {
    TicketCategory[TicketCategory["ZuConnect"] = 0] = "ZuConnect";
    TicketCategory[TicketCategory["Devconnect"] = 1] = "Devconnect";
    TicketCategory[TicketCategory["PcdWorkingGroup"] = 2] = "PcdWorkingGroup";
    TicketCategory[TicketCategory["Zuzalu"] = 3] = "Zuzalu";
})(TicketCategory || (TicketCategory = {}));
export const ZKEdDSAEventTicketPCDTypeName = "zk-eddsa-event-ticket-pcd";
/**
 * ZKEdDSAEventTicketPCD PCD type representation.
 */
export class ZKEdDSAEventTicketPCD {
    id;
    claim;
    proof;
    type = ZKEdDSAEventTicketPCDTypeName;
    constructor(id, claim, proof) {
        this.id = id;
        this.claim = claim;
        this.proof = proof;
        this.id = id;
        this.claim = claim;
        this.proof = proof;
    }
}
export class ZupassPCD {
    module;
    worker;
    readyDfd;
    verifyQueue = {};
    verifyIdCounter = 1;
    constructor(module, worker) {
        this.module = module;
        this.readyDfd = new PromiseDfd();
        this.worker = worker || ServiceManager.GetService(FaucetWorkers).createWorker("zupass-worker");
        this.worker.on("message", (msg) => this.onWorkerMessage(msg));
    }
    parseTicket(pcdData) {
        const { id, claim, proof } = JSONBig({ useNativeBigInt: true }).parse(pcdData);
        requireDefinedParameter(id, "id");
        requireDefinedParameter(claim, "claim");
        requireDefinedParameter(proof, "proof");
        return new ZKEdDSAEventTicketPCD(id, claim, proof);
    }
    /**
     * Convert a list of valid event IDs from input format (variable-length list
     * of UUID strings) to snark signal format (fixed-length list of bigint
     * strings).  The result always has length VALID_EVENT_IDS_MAX_LEN with
     * unused fields are filled in with a value of BABY_JUB_NEGATIVE_ONE.
     */
    snarkInputForValidEventIds(validEventIds) {
        const snarkIds = new Array(VALID_EVENT_IDS_MAX_LEN);
        let i = 0;
        for (const validId of validEventIds) {
            snarkIds[i] = uuidToBigInt(validId).toString();
            ++i;
        }
        for (; i < VALID_EVENT_IDS_MAX_LEN; ++i) {
            snarkIds[i] = BABY_JUB_NEGATIVE_ONE.toString();
        }
        return snarkIds;
    }
    publicSignalsFromClaim(claim) {
        const t = claim.partialTicket;
        const ret = [];
        const negOne = BABY_JUB_NEGATIVE_ONE.toString();
        // Outputs appear in public signals first
        ret.push(t.ticketId === undefined ? negOne : uuidToBigInt(t.ticketId).toString());
        ret.push(t.eventId === undefined ? negOne : uuidToBigInt(t.eventId).toString());
        ret.push(t.productId === undefined ? negOne : uuidToBigInt(t.productId).toString());
        ret.push(t.timestampConsumed === undefined ? negOne : t.timestampConsumed.toString());
        ret.push(t.timestampSigned === undefined ? negOne : t.timestampSigned.toString());
        ret.push(t.attendeeSemaphoreId || negOne);
        ret.push(t.isConsumed === undefined
            ? negOne
            : booleanToBigInt(t.isConsumed).toString());
        ret.push(t.isRevoked === undefined ? negOne : booleanToBigInt(t.isRevoked).toString());
        ret.push(t.ticketCategory === undefined
            ? negOne
            : numberToBigInt(t.ticketCategory).toString());
        // Placeholder for reserved fields
        ret.push(negOne, negOne, negOne);
        ret.push(claim.nullifierHash || negOne);
        // Public inputs appear in public signals in declaration order
        ret.push(hexToBigInt(claim.signer[0]).toString());
        ret.push(hexToBigInt(claim.signer[1]).toString());
        for (const eventId of this.snarkInputForValidEventIds(claim.validEventIds || [])) {
            ret.push(eventId);
        }
        ret.push(claim.validEventIds !== undefined ? "1" : "0"); // checkValidEventIds
        ret.push(claim.externalNullifier?.toString() ||
            STATIC_TICKET_PCD_NULLIFIER.toString());
        ret.push(claim.watermark);
        return ret;
    }
    async verifyTicket(pcd) {
        let resDfd = new PromiseDfd();
        let req = {
            reqId: this.verifyIdCounter++,
            publicSignals: this.publicSignalsFromClaim(pcd.claim),
            proof: pcd.proof,
        };
        this.verifyQueue[req.reqId] = resDfd;
        this.readyDfd.promise.then(() => {
            this.worker.postMessage({
                action: "verify",
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
            case "verified":
                this.onWorkerVerified(msg.data);
                break;
        }
    }
    onWorkerVerified(msg) {
        assert.equal(this.verifyQueue.hasOwnProperty(msg.reqId), true);
        let resDfd = this.verifyQueue[msg.reqId];
        delete this.verifyQueue[msg.reqId];
        resDfd.resolve(msg.isValid);
    }
    getTicketData(pcd) {
        let ticketData = {
            ticketId: pcd.claim.partialTicket.ticketId || "",
            productId: pcd.claim.partialTicket.productId || "",
            eventId: pcd.claim.partialTicket.eventId || "",
            attendeeId: pcd.claim.partialTicket.attendeeSemaphoreId || "",
            token: "",
        };
        ticketData.token = this.generateFaucetToken(ticketData);
        return ticketData;
    }
    getTokenPassphrase() {
        return faucetConfig.faucetSecret + "-" + this.module.getModuleName() + "-authtoken";
    }
    generateFaucetToken(pcdData) {
        return encryptStr([
            this.module.getModuleName(),
            pcdData.ticketId,
            pcdData.productId,
            pcdData.eventId,
            pcdData.attendeeId,
        ].join("\n"), this.getTokenPassphrase());
    }
    parseFaucetToken(faucetToken) {
        let tokenData = decryptStr(faucetToken, this.getTokenPassphrase())?.split("\n") || [];
        if (tokenData.length !== 5)
            return null;
        if (tokenData[0] !== this.module.getModuleName())
            return null;
        return {
            ticketId: tokenData[1],
            productId: tokenData[2],
            eventId: tokenData[3],
            attendeeId: tokenData[4],
            token: faucetToken,
        };
    }
}
//# sourceMappingURL=ZupassPCD.js.map