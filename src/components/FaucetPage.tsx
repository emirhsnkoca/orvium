import React, { useState } from 'react';
import { Droplets, Wallet, CheckCircle, AlertCircle, Copy, ExternalLink, Zap, Shield, Clock } from 'lucide-react';

interface Network {
  id: string;
  name: string;
  symbol: string;
  rpcUrl: string;
  chainId: number;
  explorerUrl: string;
  faucetAmount: string;
  cooldown: string;
  color: string;
}

const FaucetPage: React.FC = () => {
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [txHash, setTxHash] = useState('');

  const networks: Network[] = [
    {
      id: 'rise-testnet',
      name: 'Rise Chain Testnet',
      symbol: 'RISE',
      rpcUrl: 'https://testnet-rpc.risechain.com',
      chainId: 1234,
      explorerUrl: 'https://testnet-explorer.risechain.com',
      faucetAmount: '10',
      cooldown: '24 hours',
      color: '#8A2BE2'
    },
    {
      id: 'ethereum-sepolia',
      name: 'Ethereum Sepolia',
      symbol: 'ETH',
      rpcUrl: 'https://sepolia.infura.io/v3/',
      chainId: 11155111,
      explorerUrl: 'https://sepolia.etherscan.io',
      faucetAmount: '0.5',
      cooldown: '24 hours',
      color: '#627EEA'
    },
    {
      id: 'polygon-mumbai',
      name: 'Polygon Mumbai',
      symbol: 'MATIC',
      rpcUrl: 'https://rpc-mumbai.maticvigil.com',
      chainId: 80001,
      explorerUrl: 'https://mumbai.polygonscan.com',
      faucetAmount: '1',
      cooldown: '24 hours',
      color: '#8247E5'
    },
    {
      id: 'arbitrum-goerli',
      name: 'Arbitrum Goerli',
      symbol: 'ETH',
      rpcUrl: 'https://goerli-rollup.arbitrum.io/rpc',
      chainId: 421613,
      explorerUrl: 'https://goerli.arbiscan.io',
      faucetAmount: '0.1',
      cooldown: '24 hours',
      color: '#28A0F0'
    }
  ];

  const handleNetworkSelect = (network: Network) => {
    setSelectedNetwork(network);
    setRequestStatus('idle');
    setTxHash('');
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWalletAddress(e.target.value);
    setRequestStatus('idle');
  };

  const handleRequestTokens = async () => {
    if (!selectedNetwork || !walletAddress) return;

    setIsRequesting(true);
    setRequestStatus('pending');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate success
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
      setTxHash(mockTxHash);
      setRequestStatus('success');
    } catch (error) {
      setRequestStatus('error');
    } finally {
      setIsRequesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0f0f1a] to-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#8A2BE2] rounded-full opacity-10 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-[#FF00FF] rounded-full opacity-8 blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#BF40BF] rounded-full opacity-5 blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-[#8A2BE2] to-[#BF40BF] rounded-2xl">
              <Droplets size={48} className="text-white" />
            </div>
          </div>
          <h1 className="text-6xl font-bold mb-4 font-orbitron">
            <span className="bg-gradient-to-r from-[#8A2BE2] via-[#BF40BF] to-[#FF00FF] bg-clip-text text-transparent">
              TESTNET FAUCET
            </span>
          </h1>
          <p className="text-xl text-gray-300 font-poppins max-w-2xl mx-auto">
            Get free testnet tokens for development and testing on multiple blockchain networks
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Network Selection */}
            <div className="bg-gradient-to-br from-[#1A1A2E]/80 to-[#0F0F1A]/80 backdrop-blur-lg border border-[#8A2BE2]/30 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6 font-rajdhani flex items-center">
                <Zap className="mr-3 text-[#BF40BF]" size={24} />
                Select Network
              </h2>
              
              <div className="space-y-3">
                {networks.map((network) => (
                  <div
                    key={network.id}
                    onClick={() => handleNetworkSelect(network)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 hover:scale-105 ${
                      selectedNetwork?.id === network.id
                        ? `border-[${network.color}] bg-[${network.color}]/10`
                        : 'border-gray-600/30 bg-gray-800/30 hover:border-[#8A2BE2]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: network.color }}
                        ></div>
                        <div>
                          <h3 className="font-semibold text-white font-poppins">{network.name}</h3>
                          <p className="text-sm text-gray-400">{network.faucetAmount} {network.symbol} • {network.cooldown}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-gray-300">Chain ID: {network.chainId}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Request */}
            <div className="bg-gradient-to-br from-[#1A1A2E]/80 to-[#0F0F1A]/80 backdrop-blur-lg border border-[#8A2BE2]/30 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6 font-rajdhani flex items-center">
                <Wallet className="mr-3 text-[#BF40BF]" size={24} />
                Request Tokens
              </h2>

              {selectedNetwork ? (
                <div className="space-y-6">
                  {/* Selected Network Info */}
                  <div className="p-4 bg-[#8A2BE2]/10 border border-[#8A2BE2]/30 rounded-xl">
                    <div className="flex items-center space-x-3 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedNetwork.color }}
                      ></div>
                      <span className="font-semibold text-white">{selectedNetwork.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Amount:</span>
                        <span className="text-white ml-2 font-mono">{selectedNetwork.faucetAmount} {selectedNetwork.symbol}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Cooldown:</span>
                        <span className="text-white ml-2">{selectedNetwork.cooldown}</span>
                      </div>
                    </div>
                  </div>

                  {/* Wallet Address Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={handleAddressChange}
                      placeholder="0x..."
                      className="w-full bg-[#8A2BE2]/10 border border-[#8A2BE2]/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#BF40BF] focus:ring-2 focus:ring-[#8A2BE2]/20 transition-all duration-300 font-mono"
                    />
                    {walletAddress && !isValidAddress(walletAddress) && (
                      <p className="text-red-400 text-sm mt-2 flex items-center">
                        <AlertCircle size={16} className="mr-1" />
                        Invalid wallet address
                      </p>
                    )}
                  </div>

                  {/* Request Button */}
                  <button
                    onClick={handleRequestTokens}
                    disabled={!isValidAddress(walletAddress) || isRequesting}
                    className="w-full bg-gradient-to-r from-[#8A2BE2] to-[#BF40BF] hover:from-[#BF40BF] hover:to-[#FF00FF] text-white py-4 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2"
                  >
                    {isRequesting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <span>Requesting...</span>
                      </>
                    ) : (
                      <>
                        <Droplets size={20} />
                        <span>Request Tokens</span>
                      </>
                    )}
                  </button>

                  {/* Status Messages */}
                  {requestStatus === 'success' && (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                      <div className="flex items-center space-x-2 text-green-400 mb-2">
                        <CheckCircle size={20} />
                        <span className="font-semibold">Success!</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">
                        {selectedNetwork.faucetAmount} {selectedNetwork.symbol} sent to your wallet
                      </p>
                      {txHash && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">Transaction:</span>
                          <code className="text-xs bg-black/30 px-2 py-1 rounded font-mono text-green-400">
                            {txHash.slice(0, 10)}...{txHash.slice(-8)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(txHash)}
                            className="text-gray-400 hover:text-white"
                          >
                            <Copy size={16} />
                          </button>
                          <a
                            href={`${selectedNetwork.explorerUrl}/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-white"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {requestStatus === 'error' && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <div className="flex items-center space-x-2 text-red-400">
                        <AlertCircle size={20} />
                        <span className="font-semibold">Request Failed</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-2">
                        Please try again later or check if you've exceeded the rate limit.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#8A2BE2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield size={32} className="text-[#8A2BE2]" />
                  </div>
                  <p className="text-gray-400 font-poppins">
                    Please select a network to continue
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Features/Info Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-[#1A1A2E]/60 to-[#0F0F1A]/60 backdrop-blur-lg border border-[#8A2BE2]/20 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-[#8A2BE2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap size={24} className="text-[#BF40BF]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 font-rajdhani">Fast & Reliable</h3>
              <p className="text-gray-400 text-sm">
                Instant token distribution with 99.9% uptime guarantee
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#1A1A2E]/60 to-[#0F0F1A]/60 backdrop-blur-lg border border-[#8A2BE2]/20 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-[#8A2BE2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={24} className="text-[#BF40BF]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 font-rajdhani">Secure</h3>
              <p className="text-gray-400 text-sm">
                Advanced rate limiting and anti-abuse protection
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#1A1A2E]/60 to-[#0F0F1A]/60 backdrop-blur-lg border border-[#8A2BE2]/20 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-[#8A2BE2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock size={24} className="text-[#BF40BF]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 font-rajdhani">24/7 Available</h3>
              <p className="text-gray-400 text-sm">
                Access testnet tokens anytime, anywhere for development
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaucetPage;
