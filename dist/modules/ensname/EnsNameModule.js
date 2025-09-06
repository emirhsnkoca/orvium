import { ENS } from 'web3-eth-ens';
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig } from './EnsNameConfig.js';
import { FaucetError } from '../../common/FaucetError.js';
import { EthWalletManager } from '../../eth/EthWalletManager.js';
export class EnsNameModule extends BaseModule {
    moduleDefaultConfig = defaultConfig;
    ens;
    web3;
    startModule() {
        this.initEnsResolver();
        this.moduleManager.addActionHook(this, ModuleHookAction.ClientConfig, 1, "ens config", async (clientConfig) => {
            clientConfig[this.moduleName] = {
                required: !!this.moduleConfig.required,
            };
        });
        this.moduleManager.addActionHook(this, ModuleHookAction.SessionStart, 3, "resolve ens name", (session, userInput) => this.processSessionStart(session, userInput));
        return Promise.resolve();
    }
    stopModule() {
        // nothing to do
        return Promise.resolve();
    }
    onConfigReload() {
        this.initEnsResolver();
    }
    initEnsResolver() {
        let provider = EthWalletManager.getWeb3Provider(this.moduleConfig.rpcHost);
        this.ens = new ENS(this.moduleConfig.ensAddr || "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e", provider);
    }
    async processSessionStart(session, userInput) {
        let targetAddr = userInput.addr;
        let isEnsName = false;
        if (typeof targetAddr === "string" && targetAddr.match(/^[-a-zA-Z0-9@:%._\+~#=]{1,256}\.eth$/)) {
            try {
                targetAddr = (await this.ens.getAddress(targetAddr));
                session.setTargetAddr(targetAddr);
                isEnsName = true;
            }
            catch (ex) {
                throw new FaucetError("INVALID_ENSNAME", "Could not resolve ENS Name '" + targetAddr + "': " + ex.toString());
            }
        }
        if (this.moduleConfig.required && !isEnsName) {
            throw new FaucetError("REQUIRE_ENSNAME", "Only ENS Names allowed.");
        }
    }
}
//# sourceMappingURL=EnsNameModule.js.map