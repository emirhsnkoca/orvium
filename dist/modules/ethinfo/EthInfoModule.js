import { ServiceManager } from "../../common/ServiceManager.js";
import { EthWalletManager } from "../../eth/EthWalletManager.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig } from './EthInfoConfig.js';
import { FaucetError } from '../../common/FaucetError.js';
export class EthInfoModule extends BaseModule {
    moduleDefaultConfig = defaultConfig;
    startModule() {
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionStart, 7, "ETH Info check", (session, userInput) => this.processSessionStart(session, userInput));
        return Promise.resolve();
    }
    stopModule() {
        // nothing to do
        return Promise.resolve();
    }
    async processSessionStart(session, userInput) {
        if (session.getSessionData("skip.modules", []).indexOf(this.moduleName) !== -1)
            return;
        let targetAddr = session.getTargetAddr();
        let ethWalletManager = ServiceManager.GetService(EthWalletManager);
        if (this.moduleConfig.maxBalance && this.moduleConfig.maxBalance > 0) {
            let walletBalance;
            try {
                walletBalance = await ServiceManager.GetService(EthWalletManager).getWalletBalance(targetAddr);
            }
            catch (ex) {
                throw new FaucetError("BALANCE_ERROR", "Could not get balance of Wallet " + targetAddr + ": " + ex.toString());
            }
            if (walletBalance > this.moduleConfig.maxBalance)
                throw new FaucetError("BALANCE_LIMIT", "You're already holding " + ServiceManager.GetService(EthWalletManager).readableAmount(walletBalance) + " in your wallet. Please give others a chance to get some funds too.");
        }
        if (this.moduleConfig.denyContract) {
            try {
                if (await ethWalletManager.checkIsContract(targetAddr)) {
                    throw new FaucetError("CONTRACT_ADDR", "Cannot start session for " + targetAddr + " (address is a contract)");
                }
            }
            catch (ex) {
                if (!(ex instanceof FaucetError))
                    ex = new FaucetError("CONTRACT_LIMIT", "Could not check contract status of wallet " + targetAddr + ": " + ex.toString());
                throw ex;
            }
        }
    }
}
//# sourceMappingURL=EthInfoModule.js.map