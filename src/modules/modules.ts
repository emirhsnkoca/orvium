import { CaptchaModule } from "./captcha/CaptchaModule.js";
import { ConcurrencyLimitModule } from "./concurrency-limit/ConcurrencyLimitModule.js";
import { EnsNameModule } from "./ensname/EnsNameModule.js";
import { EthInfoModule } from "./ethinfo/EthInfoModule.js";
import { FaucetBalanceModule } from "./faucet-balance/FaucetBalanceModule.js";
import { FaucetOutflowModule } from "./faucet-outflow/FaucetOutflowModule.js";
import { GithubModule } from "./github/GithubModule.js";
import { IPInfoModule } from "./ipinfo/IPInfoModule.js";
import { MainnetWalletModule } from "./mainnet-wallet/MainnetWalletModule.js";
import { PassportModule } from "./passport/PassportModule.js";
import { PoWModule } from "./pow/PoWModule.js";
import { RecurringLimitsModule } from "./recurring-limits/RecurringLimitsModule.js";
import { VoucherModule } from "./voucher/VoucherModule.js";
import { WhitelistModule } from "./whitelist/WhitelistModule.js";
import { ZupassModule } from "./zupass/ZupassModule.js";

export const MODULE_CLASSES = {
  "captcha": CaptchaModule,
  "concurrency-limit": ConcurrencyLimitModule,
  "ensname": EnsNameModule,
  "ethinfo": EthInfoModule,
  "faucet-balance": FaucetBalanceModule,
  "faucet-outflow": FaucetOutflowModule,
  "github": GithubModule,
  "ipinfo": IPInfoModule,
  "mainnet-wallet": MainnetWalletModule,
  "passport": PassportModule,
  "pow": PoWModule,
  "recurring-limits": RecurringLimitsModule,
  "voucher": VoucherModule,
  "whitelist": WhitelistModule,
  "zupass": ZupassModule,
}
