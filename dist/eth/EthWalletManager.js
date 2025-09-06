import Web3, { TransactionNotFound } from 'web3';
import * as EthCom from '@ethereumjs/common';
import * as EthTx from '@ethereumjs/tx';
import * as EthUtil from '@ethereumjs/util';
import { ethRpcMethods } from 'web3-rpc-methods';
import { faucetConfig } from '../config/FaucetConfig.js';
import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess.js';
import { FaucetStatus, FaucetStatusLevel } from '../services/FaucetStatus.js';
import { strFormatPlaceholder } from '../utils/StringUtils.js';
import { sleepPromise } from '../utils/PromiseUtils.js';
import { Erc20Abi } from '../abi/ERC20.js';
import IpcProvider from 'web3-providers-ipc';
export var FaucetCoinType;
(function (FaucetCoinType) {
    FaucetCoinType["NATIVE"] = "native";
    FaucetCoinType["ERC20"] = "erc20";
})(FaucetCoinType || (FaucetCoinType = {}));
export class EthWalletManager {
    static getWeb3Provider(rpcHost) {
        if (rpcHost && typeof rpcHost === "object")
            return rpcHost;
        else if (rpcHost.match(/^wss?:\/\//))
            return new Web3.providers.WebsocketProvider(rpcHost);
        else if (rpcHost.match(/^\//))
            return new IpcProvider(rpcHost);
        else
            return new Web3.providers.HttpProvider(rpcHost);
    }
    initialized;
    web3;
    chainCommon;
    walletKey;
    walletAddr;
    walletState;
    tokenState;
    lastWalletRefresh;
    txReceiptPollInterval = 12000;
    async initialize() {
        if (this.initialized)
            return;
        this.initialized = true;
        this.walletState = {
            ready: false,
            nonce: 0,
            balance: 0n,
            nativeBalance: 0n,
        };
        this.startWeb3();
        if (typeof faucetConfig.ethChainId === "number")
            this.initChainCommon(BigInt(faucetConfig.ethChainId));
        let privkey = faucetConfig.ethWalletKey;
        if (privkey.match(/^0x/))
            privkey = privkey.substring(2);
        this.walletKey = Buffer.from(privkey, "hex");
        this.walletAddr = EthUtil.toChecksumAddress(EthUtil.bytesToHex(EthUtil.privateToAddress(this.walletKey)));
        await this.loadWalletState();
        // reload handler
        ServiceManager.GetService(FaucetProcess).addListener("reload", () => {
            this.startWeb3();
            this.lastWalletRefresh = 0;
        });
    }
    initChainCommon(chainId) {
        if (this.chainCommon && this.chainCommon.chainId() === chainId)
            return;
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Web3 ChainCommon initialized with chainId " + chainId);
        this.chainCommon = EthCom.createCustomCommon({
            chainId: chainId.toString(),
        }, EthCom.Mainnet);
    }
    startWeb3() {
        let provider = EthWalletManager.getWeb3Provider(faucetConfig.ethRpcHost);
        this.web3 = new Web3(provider);
        if (faucetConfig.faucetCoinType !== FaucetCoinType.NATIVE)
            this.initWeb3Token();
        else
            this.tokenState = null;
        try {
            provider.on('error', e => {
                ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Web3 provider error: " + e.toString());
            });
            provider.on('end', e => {
                ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Web3 connection lost...");
                this.web3 = null;
                setTimeout(() => {
                    this.startWeb3();
                }, 2000);
            });
        }
        catch (ex) { }
    }
    initWeb3Token() {
        switch (faucetConfig.faucetCoinType) {
            case FaucetCoinType.ERC20:
                let tokenContract = new this.web3.eth.Contract(Erc20Abi, faucetConfig.faucetCoinContract, {
                    from: this.walletAddr,
                });
                this.tokenState = {
                    address: faucetConfig.faucetCoinContract,
                    contract: tokenContract,
                    decimals: 0,
                    getBalance: (addr) => tokenContract.methods.balanceOf(addr).call(),
                    getTransferData: (addr, amount) => tokenContract.methods['transfer'](addr, amount).encodeABI(),
                };
                tokenContract.methods.decimals().call().then((res) => {
                    this.tokenState.decimals = Number(res);
                });
                break;
            default:
                ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Unknown coin type: " + faucetConfig.faucetCoinType);
                return;
        }
    }
    getWalletState() {
        return this.walletState;
    }
    getLastWalletRefresh() {
        return this.lastWalletRefresh;
    }
    loadWalletState() {
        this.lastWalletRefresh = Math.floor(new Date().getTime() / 1000);
        let chainIdPromise = typeof faucetConfig.ethChainId === "number" ? Promise.resolve(faucetConfig.ethChainId) : this.web3.eth.getChainId();
        let tokenBalancePromise = this.tokenState?.getBalance(this.walletAddr);
        return Promise.all([
            this.web3.eth.getBalance(this.walletAddr, "pending"),
            this.web3.eth.getTransactionCount(this.walletAddr, "pending"),
            chainIdPromise,
            tokenBalancePromise,
        ]).catch((ex) => {
            if (ex.toString().match(/"pending" is not yet supported/)) {
                return Promise.all([
                    this.web3.eth.getBalance(this.walletAddr),
                    this.web3.eth.getTransactionCount(this.walletAddr),
                    chainIdPromise,
                    tokenBalancePromise,
                ]);
            }
            else
                throw ex;
        }).then((res) => {
            this.initChainCommon(BigInt(res[2]));
            Object.assign(this.walletState, {
                ready: true,
                balance: this.tokenState ? BigInt(res[3]) : BigInt(res[0]),
                nativeBalance: BigInt(res[0]),
                nonce: Number(res[1]),
            });
            ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Wallet " + this.walletAddr + ":  " + this.readableAmount(this.walletState.balance) + "  [Nonce: " + this.walletState.nonce + "]");
        }, (err) => {
            Object.assign(this.walletState, {
                ready: false,
                balance: 0n,
                nativeBalance: 0n,
                nonce: 0,
            });
            ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Error loading wallet state for " + this.walletAddr + ": " + err.toString());
        }).then(() => {
            this.updateFaucetStatus();
        });
    }
    updateFaucetStatus() {
        let statusMessage = null;
        let statusLevel = null;
        if (this.walletState) {
            if (!statusLevel && !this.walletState.ready) {
                if (typeof faucetConfig.rpcConnectionError === "string")
                    statusMessage = faucetConfig.rpcConnectionError;
                else if (faucetConfig.rpcConnectionError)
                    statusMessage = "The faucet could not connect to the network RPC";
                if (statusMessage) {
                    statusMessage = strFormatPlaceholder(statusMessage);
                    statusLevel = FaucetStatusLevel.ERROR;
                }
            }
            if (!statusLevel && (this.walletState.balance <= faucetConfig.noFundsBalance ||
                this.walletState.nativeBalance <= BigInt(faucetConfig.ethTxGasLimit) * BigInt(faucetConfig.ethTxMaxFee))) {
                if (typeof faucetConfig.noFundsError === "string")
                    statusMessage = faucetConfig.noFundsError;
                else if (faucetConfig.noFundsError)
                    statusMessage = "The faucet is out of funds!";
                if (statusMessage) {
                    statusMessage = strFormatPlaceholder(statusMessage);
                    statusLevel = FaucetStatusLevel.ERROR;
                }
            }
            if (!statusLevel && this.walletState.balance <= faucetConfig.lowFundsBalance) {
                if (typeof faucetConfig.lowFundsWarning === "string")
                    statusMessage = faucetConfig.lowFundsWarning;
                else if (faucetConfig.lowFundsWarning)
                    statusMessage = "The faucet is running out of funds! Faucet Balance: {1}";
                if (statusMessage) {
                    statusMessage = strFormatPlaceholder(statusMessage, this.readableAmount(this.walletState.balance));
                    statusLevel = FaucetStatusLevel.WARNING;
                }
            }
        }
        ServiceManager.GetService(FaucetStatus).setFaucetStatus("wallet", statusMessage, statusLevel);
    }
    getFaucetAddress() {
        return this.walletAddr;
    }
    getTokenAddress() {
        return this.tokenState ? this.tokenState.address : null;
    }
    getFaucetDecimals(native) {
        return ((this.tokenState && !native) ? this.tokenState.decimals : 18) || 18;
    }
    decimalUnitAmount(amount, native) {
        let decimals = this.getFaucetDecimals(native);
        let factor = Math.pow(10, decimals);
        return parseInt(amount.toString()) / factor;
    }
    readableAmount(amount, native) {
        let amountStr = (Math.floor(this.decimalUnitAmount(amount, native) * 1000) / 1000).toString();
        return amountStr + " " + (native ? "ETH" : faucetConfig.faucetCoinSymbol);
    }
    async getWalletBalance(addr) {
        if (this.tokenState)
            return await this.tokenState.getBalance(addr);
        else
            return BigInt(await this.web3.eth.getBalance(addr));
    }
    checkIsContract(addr) {
        return this.web3.eth.getCode(addr).then((res) => res && !!res.match(/^0x[0-9a-f]{2,}$/) && !res.match(/^0xef0100/));
    }
    getFaucetBalance(native) {
        if (native)
            return this.walletState?.nativeBalance;
        else
            return this.walletState?.balance;
    }
    getContractInterface(addr, abi) {
        return new this.web3.eth.Contract(abi, addr, {
            from: this.walletAddr,
        });
    }
    async watchClaimTx(claimInfo) {
        return this.awaitTransactionReceipt(claimInfo.claim.txHash, claimInfo.claim.txNonce).then((receipt) => {
            let txfee = BigInt(receipt.effectiveGasPrice) * BigInt(receipt.gasUsed);
            this.walletState.nativeBalance -= txfee;
            if (!this.tokenState)
                this.walletState.balance -= txfee;
            return {
                status: Number(receipt.status) > 0,
                block: Number(receipt.blockNumber),
                fee: txfee,
                receipt: receipt,
            };
        });
    }
    async sendClaimTx(claimInfo) {
        let txPromise;
        let retryCount = 0;
        let txError;
        let buildTx = () => {
            claimInfo.claim.txNonce = this.walletState.nonce;
            if (this.tokenState)
                return this.buildEthTx(this.tokenState.address, 0n, claimInfo.claim.txNonce, this.tokenState.getTransferData(claimInfo.target, BigInt(claimInfo.amount)));
            else
                return this.buildEthTx(claimInfo.target, BigInt(claimInfo.amount), claimInfo.claim.txNonce);
        };
        do {
            try {
                claimInfo.claim.txHex = await buildTx();
                let txResult = await this.sendTransaction(claimInfo.claim.txHex, claimInfo.claim.txNonce);
                claimInfo.claim.txHash = txResult[0];
                txPromise = txResult[1];
            }
            catch (ex) {
                if (!txError)
                    txError = ex;
                ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Sending TX for " + claimInfo.target + " failed [try: " + retryCount + "]: " + ex.toString());
                await sleepPromise(2000); // wait 2 secs and try again - maybe EL client is busy...
                await this.loadWalletState();
            }
        } while (!txPromise && retryCount++ < 3);
        if (!txPromise)
            throw txError;
        this.walletState.nonce++;
        this.walletState.balance -= BigInt(claimInfo.amount);
        if (!this.tokenState)
            this.walletState.nativeBalance -= BigInt(claimInfo.amount);
        this.updateFaucetStatus();
        return {
            txHash: claimInfo.claim.txHash,
            txPromise: txPromise.then((receipt) => {
                let txfee = BigInt(receipt.effectiveGasPrice) * BigInt(receipt.gasUsed);
                this.walletState.nativeBalance -= txfee;
                if (!this.tokenState)
                    this.walletState.balance -= txfee;
                return {
                    status: Number(receipt.status) > 0,
                    block: Number(receipt.blockNumber),
                    fee: txfee,
                    receipt: receipt,
                };
            }),
        };
    }
    async sendCustomTx(target, amount, data, gasLimit) {
        let txHex = await this.buildEthTx(target, amount, this.walletState.nonce, data, gasLimit);
        let txResult = await this.sendTransaction(txHex, this.walletState.nonce);
        this.walletState.nonce++;
        return {
            txHash: txResult[0],
            txPromise: txResult[1].then((receipt) => {
                let txfee = BigInt(receipt.effectiveGasPrice) * BigInt(receipt.gasUsed);
                this.walletState.nativeBalance -= txfee;
                if (!this.tokenState)
                    this.walletState.balance -= txfee;
                return {
                    status: Number(receipt.status) > 0,
                    block: Number(receipt.blockNumber),
                    fee: txfee,
                    receipt: receipt,
                };
            }),
        };
    }
    async buildEthTx(target, amount, nonce, data, gasLimit) {
        if (target.match(/^0X/))
            target = "0x" + target.substring(2);
        let tx;
        if (faucetConfig.ethLegacyTx) {
            // legacy transaction
            let gasPrice = await this.web3.eth.getGasPrice();
            gasPrice += BigInt(faucetConfig.ethTxPrioFee);
            if (faucetConfig.ethTxMaxFee > 0 && gasPrice > faucetConfig.ethTxMaxFee)
                gasPrice = BigInt(faucetConfig.ethTxMaxFee);
            tx = EthTx.createLegacyTx({
                nonce: nonce,
                gasLimit: gasLimit || faucetConfig.ethTxGasLimit,
                gasPrice: gasPrice,
                to: target,
                value: "0x" + amount.toString(16),
                data: (data ? data : "0x")
            }, {
                common: this.chainCommon
            });
        }
        else {
            // eip1559 transaction
            tx = EthTx.createFeeMarket1559Tx({
                nonce: nonce,
                gasLimit: gasLimit || faucetConfig.ethTxGasLimit,
                maxPriorityFeePerGas: faucetConfig.ethTxPrioFee,
                maxFeePerGas: faucetConfig.ethTxMaxFee,
                to: target,
                value: "0x" + amount.toString(16),
                data: (data ? data : "0x")
            }, {
                common: this.chainCommon
            });
        }
        tx = tx.sign(this.walletKey);
        return Buffer.from(tx.serialize()).toString('hex');
    }
    async sendTransaction(txhex, txnonce) {
        let txHash = await ethRpcMethods.sendRawTransaction(this.web3.eth.requestManager, "0x" + txhex);
        return [txHash, this.awaitTransactionReceipt(txHash, txnonce)];
    }
    /*
    private async sendTransaction(txhex: string, nonce: number): Promise<[string, Promise<TransactionReceipt>]> {
      let txhashDfd = new PromiseDfd<string>();
      let receiptDfd = new PromiseDfd<TransactionReceipt>();
      let txStatus = 0;
  
      let txPromise = this.web3.eth.sendSignedTransaction("0x" + txhex);
      txPromise.once('transactionHash', (hash) => {
        txStatus = 1;
        txhashDfd.resolve(hash);
      });
      txPromise.once('receipt', (receipt) => {
        txStatus = 2;
        receiptDfd.resolve(receipt);
      });
      
      let errorHandler = (error) => {
        if(txStatus === 0)
          txhashDfd.reject(error);
        else
          receiptDfd.reject(error);
      };
      txPromise.on('error', errorHandler);
      txPromise.catch(errorHandler);
  
      let txHash = await txhashDfd.promise;
      return [txHash, receiptDfd.promise];
    }
    */
    async awaitTransactionReceipt(txhash, txnonce) {
        while (true) {
            let receipt;
            try {
                return await this.web3.eth.getTransactionReceipt(txhash);
            }
            catch (ex) {
                if (ex instanceof TransactionNotFound || ex.toString().match(/CONNECTION ERROR/) || ex.toString().match(/invalid json response/)) {
                    // just retry when RPC connection issue
                }
                else {
                    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Error while polling transaction receipt for " + txhash + ": " + ex.toString());
                    console.log("err ", ex);
                    throw ex;
                }
            }
            await sleepPromise(this.txReceiptPollInterval); // 12 secs
        }
    }
}
//# sourceMappingURL=EthWalletManager.js.map