import { clearInterval } from "timers";
import { ServiceManager } from "../../common/ServiceManager.js";
import { FaucetDatabase } from "../../db/FaucetDatabase.js";
import { BaseModule } from "../BaseModule.js";
import { defaultConfig } from "./FaucetOutflowConfig.js";
import { ModuleHookAction } from "../ModuleManager.js";
export class FaucetOutflowModule extends BaseModule {
    moduleDefaultConfig = defaultConfig;
    outflowState;
    saveTimer;
    async startModule() {
        this.saveTimer = setInterval(() => this.saveOutflowState(), 60 * 1000);
        await this.loadOutflowState();
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionRewardFactor, 5, "faucet outflow", (session, rewardFactors) => this.processSessionRewardFactor(session, rewardFactors));
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionRewarded, 5, "faucet outflow", (session, amount) => this.updateState(session, amount));
        this.enforceBalanceBoundaries();
    }
    stopModule() {
        clearInterval(this.saveTimer);
        this.saveTimer = null;
        return Promise.resolve();
    }
    onConfigReload() {
        this.enforceBalanceBoundaries();
    }
    async processSessionRewardFactor(session, rewardFactors) {
        if (session.getSessionData("skip.modules", []).indexOf(this.moduleName) !== -1)
            return;
        let outflowRestriction = this.getOutflowRestriction();
        if (outflowRestriction < 100) {
            rewardFactors.push({
                factor: outflowRestriction / 100,
                module: this.moduleName,
            });
        }
    }
    now() {
        return Math.floor((new Date()).getTime() / 1000);
    }
    async loadOutflowState() {
        let stateJson = await ServiceManager.GetService(FaucetDatabase).getKeyValueEntry("PoWOutflowLimiter.state");
        if (stateJson) {
            let stateObj = JSON.parse(stateJson);
            this.outflowState = {
                trackTime: stateObj.trackTime,
                dustAmount: 0n,
            };
        }
        else {
            this.outflowState = {
                trackTime: this.now(),
                dustAmount: 0n,
            };
        }
    }
    async saveOutflowState() {
        if (this.outflowState) {
            await ServiceManager.GetService(FaucetDatabase).setKeyValueEntry("PoWOutflowLimiter.state", JSON.stringify({
                trackTime: this.outflowState.trackTime,
                dustAmount: this.outflowState.dustAmount.toString(),
            }));
        }
    }
    updateState(session, minedAmount) {
        if (session && session.getSessionData("skip.modules", []).indexOf(this.moduleName) !== -1)
            return;
        if (minedAmount < 0)
            return;
        this.getOutflowBalance();
        // add minedAmount
        if (minedAmount <= this.outflowState.dustAmount) {
            this.outflowState.dustAmount -= minedAmount;
        }
        else {
            minedAmount -= this.outflowState.dustAmount;
            let minedTime = minedAmount * BigInt(this.moduleConfig.duration) / BigInt(this.moduleConfig.amount);
            if (minedTime * BigInt(this.moduleConfig.amount) / BigInt(this.moduleConfig.duration) < minedAmount) {
                minedTime++;
                this.outflowState.dustAmount = (minedTime * BigInt(this.moduleConfig.amount) / BigInt(this.moduleConfig.duration)) - minedAmount;
            }
            else {
                this.outflowState.dustAmount = 0n;
            }
            this.outflowState.trackTime += parseInt(minedTime.toString());
        }
    }
    getOutflowBalance() {
        let now = this.now();
        let timeDiff = now - this.outflowState.trackTime;
        let balance = BigInt(timeDiff) * BigInt(this.moduleConfig.amount) / BigInt(this.moduleConfig.duration);
        balance += this.outflowState.dustAmount;
        // check upperLimit
        if (balance > BigInt(this.moduleConfig.upperLimit)) {
            let upperTimeLimit = BigInt(this.moduleConfig.upperLimit) * BigInt(this.moduleConfig.duration) / BigInt(this.moduleConfig.amount);
            this.outflowState.trackTime = now - Number(upperTimeLimit);
            this.outflowState.dustAmount = 0n;
            balance = BigInt(this.moduleConfig.upperLimit);
        }
        return balance;
    }
    enforceBalanceBoundaries() {
        let balance = this.getOutflowBalance();
        // check lowerLimit
        if (balance < BigInt(this.moduleConfig.lowerLimit)) {
            let lowerTimeLimit = BigInt(this.moduleConfig.lowerLimit * -1) * BigInt(this.moduleConfig.duration) / BigInt(this.moduleConfig.amount);
            this.outflowState.trackTime = this.now() + Number(lowerTimeLimit);
            this.outflowState.dustAmount = 0n;
        }
    }
    getOutflowRestriction() {
        let now = this.now();
        let outflowBalance;
        if (this.outflowState.trackTime <= now || (outflowBalance = this.getOutflowBalance()) >= 0)
            return 100;
        let lowerLimit = BigInt(this.moduleConfig.lowerLimit);
        let remainingAmount = outflowBalance < lowerLimit ? 0n : lowerLimit - outflowBalance;
        return Number(10000n * remainingAmount / lowerLimit) / 100;
    }
    getOutflowDebugState() {
        return {
            now: this.now(),
            trackTime: this.outflowState.trackTime,
            dustAmount: this.outflowState.dustAmount.toString(),
            balance: this.getOutflowBalance().toString(),
            restriction: this.getOutflowRestriction(),
            amount: this.moduleConfig.amount,
            duration: this.moduleConfig.duration,
            lowerLimit: this.moduleConfig.lowerLimit,
            upperLimit: this.moduleConfig.upperLimit,
        };
    }
}
//# sourceMappingURL=FaucetOutflowModule.js.map