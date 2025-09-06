import { faucetConfig } from "../config/FaucetConfig.js";
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess.js";
import { ServiceManager } from "../common/ServiceManager.js";
import { EthClaimManager } from "./EthClaimManager.js";
import { EthWalletManager } from "./EthWalletManager.js";
import { SessionManager } from "../session/SessionManager.js";
export class EthWalletRefill {
    lastWalletRefill;
    lastWalletRefillTry;
    walletRefillPromise;
    now() {
        return Math.floor(new Date().getTime() / 1000);
    }
    processWalletRefill() {
        if (!this.walletRefillPromise) {
            this.walletRefillPromise = this.tryRefillWallet();
            this.walletRefillPromise.finally(() => {
                this.walletRefillPromise = null;
            });
        }
        return this.walletRefillPromise;
    }
    async tryRefillWallet() {
        if (!faucetConfig.ethRefillContract)
            return;
        let now = this.now();
        if (this.lastWalletRefillTry && now - this.lastWalletRefillTry < 60)
            return;
        if (this.lastWalletRefill && faucetConfig.ethRefillContract.cooldownTime && now - this.lastWalletRefill < faucetConfig.ethRefillContract.cooldownTime)
            return;
        this.lastWalletRefillTry = now;
        let walletState = ServiceManager.GetService(EthWalletManager).getWalletState();
        let unclaimedBalance = await ServiceManager.GetService(SessionManager).getUnclaimedBalance();
        let walletBalance = walletState.balance - unclaimedBalance - ServiceManager.GetService(EthClaimManager).getQueuedAmount();
        let refillAction = null;
        if (faucetConfig.ethRefillContract.overflowBalance && walletBalance > BigInt(faucetConfig.ethRefillContract.overflowBalance))
            refillAction = "overflow";
        else if (walletBalance < BigInt(faucetConfig.ethRefillContract.triggerBalance))
            refillAction = "refill";
        if (!refillAction)
            return;
        try {
            let txResult;
            if (refillAction == "refill")
                txResult = await this.refillWallet();
            else if (refillAction == "overflow")
                txResult = await this.overflowWallet(walletBalance - BigInt(faucetConfig.ethRefillContract.overflowBalance));
            this.lastWalletRefill = this.now();
            ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Sending " + refillAction + " transaction to vault contract: " + txResult.txHash);
            try {
                let txReceipt = await txResult.txPromise;
                if (!txReceipt.status)
                    throw txReceipt.receipt;
                await ServiceManager.GetService(EthWalletManager).loadWalletState(); // refresh balance
                ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Faucet wallet successfully refilled from vault contract.");
            }
            catch (err) {
                ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Faucet wallet refill transaction reverted: " + err.toString());
            }
        }
        catch (ex) {
            ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Faucet wallet refill from vault contract failed: " + ex.toString());
        }
    }
    resolveCallArgs(args, amount) {
        let ethWalletManager = ServiceManager.GetService(EthWalletManager);
        return args.map((arg) => {
            switch (arg) {
                case "{walletAddr}":
                    arg = ethWalletManager.getFaucetAddress();
                    break;
                case "{amount}":
                    arg = amount;
                    break;
                case "{token}":
                    arg = ethWalletManager.getTokenAddress();
                    break;
            }
            return arg;
        });
    }
    async refillWallet() {
        let ethWalletManager = ServiceManager.GetService(EthWalletManager);
        let refillContractAbi = JSON.parse(faucetConfig.ethRefillContract.abi);
        let refillContract = ethWalletManager.getContractInterface(faucetConfig.ethRefillContract.contract, refillContractAbi);
        let refillAmount = BigInt(faucetConfig.ethRefillContract.requestAmount) || 0n;
        let refillAllowance = null;
        let getCallArgs = (args) => this.resolveCallArgs(args, refillAmount.toString());
        if (faucetConfig.ethRefillContract.allowanceFn) {
            // check allowance
            let callArgs = getCallArgs(faucetConfig.ethRefillContract.allowanceFnArgs || ["{walletAddr}"]);
            refillAllowance = BigInt(await refillContract.methods[faucetConfig.ethRefillContract.allowanceFn].apply(this, callArgs).call());
            if (refillAllowance == 0n)
                throw "no withdrawable funds from refill contract";
            if (refillAmount > refillAllowance)
                refillAmount = refillAllowance;
        }
        if (faucetConfig.ethRefillContract.checkContractBalance) {
            let checkAddr = (typeof faucetConfig.ethRefillContract.checkContractBalance === "string" ? faucetConfig.ethRefillContract.checkContractBalance : faucetConfig.ethRefillContract.contract);
            let contractBalance = await ethWalletManager.getWalletBalance(checkAddr);
            let dustBalance = faucetConfig.ethRefillContract.contractDustBalance ? BigInt(faucetConfig.ethRefillContract.contractDustBalance) : 1000000000n;
            if (contractBalance <= dustBalance)
                throw "refill contract is out of funds";
            if (refillAmount > contractBalance)
                refillAmount = contractBalance;
        }
        let callArgs = getCallArgs(faucetConfig.ethRefillContract.withdrawFnArgs || ["{amount}"]);
        return await ethWalletManager.sendCustomTx(faucetConfig.ethRefillContract.contract, 0n, refillContract.methods[faucetConfig.ethRefillContract.withdrawFn].apply(this, callArgs).encodeABI(), faucetConfig.ethRefillContract.withdrawGasLimit);
    }
    async overflowWallet(amount) {
        let ethWalletManager = ServiceManager.GetService(EthWalletManager);
        let refillContractAbi = JSON.parse(faucetConfig.ethRefillContract.abi);
        let refillContract = ethWalletManager.getContractInterface(faucetConfig.ethRefillContract.contract, refillContractAbi);
        let getCallArgs = (args) => this.resolveCallArgs(args, amount.toString());
        let callArgs = getCallArgs(faucetConfig.ethRefillContract.depositFnArgs || []);
        return await ethWalletManager.sendCustomTx(faucetConfig.ethRefillContract.contract, amount, faucetConfig.ethRefillContract.depositFn ? refillContract.methods[faucetConfig.ethRefillContract.depositFn].apply(this, callArgs).encodeABI() : undefined, faucetConfig.ethRefillContract.withdrawGasLimit);
    }
    getFaucetRefillCooldown() {
        let now = this.now();
        if (!faucetConfig.ethRefillContract || !faucetConfig.ethRefillContract.cooldownTime)
            return 0;
        if (!this.lastWalletRefill)
            return 0;
        let cooldown = faucetConfig.ethRefillContract.cooldownTime - (now - this.lastWalletRefill);
        if (cooldown < 0)
            return 0;
        return cooldown;
    }
}
//# sourceMappingURL=EthWalletRefill.js.map