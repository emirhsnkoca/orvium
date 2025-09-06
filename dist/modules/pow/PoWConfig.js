export var PoWHashAlgo;
(function (PoWHashAlgo) {
    PoWHashAlgo["SCRYPT"] = "scrypt";
    PoWHashAlgo["CRYPTONIGHT"] = "cryptonight";
    PoWHashAlgo["ARGON2"] = "argon2";
    PoWHashAlgo["NICKMINER"] = "nickminer";
})(PoWHashAlgo || (PoWHashAlgo = {}));
export const defaultConfig = {
    enabled: false,
    powShareReward: 0,
    powSessionTimeout: 7200,
    powIdleTimeout: 1800,
    powPingInterval: 60,
    powPingTimeout: 120,
    powHashAlgo: PoWHashAlgo.ARGON2,
    powScryptParams: {
        cpuAndMemory: 4096,
        blockSize: 8,
        parallelization: 1,
        keyLength: 16,
    },
    powCryptoNightParams: {
        algo: 0,
        variant: 0,
        height: 0,
    },
    powArgon2Params: {
        type: 0,
        version: 13,
        timeCost: 4,
        memoryCost: 4096,
        parallelization: 1,
        keyLength: 16,
    },
    powNickMinerParams: {
        hash: "1234567890123456",
        sigR: "0539",
        sigV: 27,
        count: 60,
        suffix: "beac02",
        prefix: "0000",
        relevantDifficulty: 0,
        relevantFile: null,
    },
    powDifficulty: 11,
    powHashrateSoftLimit: 0,
    powHashrateHardLimit: 0,
    powSessionsPerServer: 0,
    verifyLocalPercent: 10,
    verifyLocalMaxQueue: 100,
    verifyMinerPeerCount: 4,
    verifyLocalLowPeerPercent: 80,
    verifyMinerPercent: 75,
    verifyMinerIndividuals: 2,
    verifyMinerMaxPending: 5,
    verifyMinerMaxMissed: 10,
    verifyMinerTimeout: 30,
    verifyMinerRewardPerc: 15,
    verifyMinerMissPenaltyPerc: 10,
};
//# sourceMappingURL=PoWConfig.js.map