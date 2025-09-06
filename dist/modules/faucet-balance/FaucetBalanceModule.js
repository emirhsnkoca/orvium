import { ServiceManager } from "../../common/ServiceManager.js";
import { EthWalletManager } from "../../eth/EthWalletManager.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig } from './FaucetBalanceConfig.js';
import { EthClaimManager } from "../../eth/EthClaimManager.js";
import { faucetConfig } from "../../config/FaucetConfig.js";
import { SessionManager } from "../../session/SessionManager.js";
export class FaucetBalanceModule extends BaseModule {
    moduleDefaultConfig = defaultConfig;
    balanceRestriction;
    balanceRestrictionRefresh = 0;
    startModule() {
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionRewardFactor, 6, "faucet balance", (session, rewardFactors) => this.processSessionRewardFactor(session, rewardFactors));
        return Promise.resolve();
    }
    stopModule() {
        // nothing to do
        return Promise.resolve();
    }
    onConfigReload() {
        this.balanceRestrictionRefresh = 0;
    }
    async processSessionRewardFactor(session, rewardFactors) {
        if (session.getSessionData("skip.modules", []).indexOf(this.moduleName) !== -1)
            return;
        await this.refreshBalanceRestriction();
        if (this.balanceRestriction !== 100) {
            rewardFactors.push({
                factor: this.balanceRestriction / 100,
                module: this.moduleName,
            });
        }
    }
    async refreshBalanceRestriction() {
        let now = Math.floor((new Date()).getTime() / 1000);
        if (this.balanceRestrictionRefresh > now - 30)
            return;
        let faucetBalance = ServiceManager.GetService(EthWalletManager).getFaucetBalance();
        if (faucetBalance === null)
            return;
        this.balanceRestrictionRefresh = now;
        faucetBalance -= await ServiceManager.GetService(SessionManager).getUnclaimedBalance(); // subtract balance from active & claimable sessions
        faucetBalance -= ServiceManager.GetService(EthClaimManager).getQueuedAmount(); // subtract pending transaction amounts
        this.balanceRestriction = Math.min(this.getStaticBalanceRestriction(faucetBalance), this.getDynamicBalanceRestriction(faucetBalance));
    }
    getBalanceRestriction() {
        return this.balanceRestriction;
    }
    getStaticBalanceRestriction(balance) {
        if (!this.moduleConfig.fixedRestriction)
            return 100;
        let restrictedReward = 100;
        let minbalances = Object.keys(this.moduleConfig.fixedRestriction).map((v) => parseInt(v)).sort((a, b) => a - b);
        if (balance <= minbalances[minbalances.length - 1]) {
            for (let i = 0; i < minbalances.length; i++) {
                if (balance <= minbalances[i]) {
                    let restriction = this.moduleConfig.fixedRestriction[minbalances[i]];
                    if (restriction < restrictedReward)
                        restrictedReward = restriction;
                }
            }
        }
        return restrictedReward;
    }
    getDynamicBalanceRestriction(balance) {
        if (!this.moduleConfig.dynamicRestriction || !this.moduleConfig.dynamicRestriction.targetBalance)
            return 100;
        let targetBalance = BigInt(this.moduleConfig.dynamicRestriction.targetBalance);
        if (balance >= targetBalance)
            return 100;
        if (balance <= faucetConfig.spareFundsAmount)
            return 0;
        let mineableBalance = balance - BigInt(faucetConfig.spareFundsAmount);
        let balanceRestriction = parseInt((mineableBalance * 100000n / targetBalance).toString()) / 1000;
        return balanceRestriction;
    }
}
//# sourceMappingURL=FaucetBalanceModule.js.map