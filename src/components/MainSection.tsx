import React from 'react';
import { ArrowRightLeft, Shield, Droplets, Users, Sparkles, ArrowRight } from 'lucide-react';

const MainSection: React.FC = () => {
  const features = [
    {
      id: 1,
      title: "Smart Swap & Transfer",
      description: "Instantly and securely swap or send your assets with intelligent automation and real-time market analysis.",
      icon: ArrowRightLeft,
      link: "https://swap-transfer.vercel.app",
      gradient: "from-[#8A2BE2] to-[#BF40BF]",
      accentColor: "#8A2BE2"
    },
    {
      id: 2,
      title: "Security Guardian",
      description: "Advanced phishing detection system that instantly identifies suspicious contract addresses and protects your assets.",
      icon: Shield,
      link: "https://phishing-detector.vercel.app",
      gradient: "from-[#BF40BF] to-[#FF00FF]",
      accentColor: "#BF40BF"
    },
    {
      id: 3,
      title: "Testnet Faucet Hub",
      description: "Quick and easy access to testnet tokens for developers. Multiple networks supported with instant distribution.",
      icon: Droplets,
      link: "https://pov-faucet.vercel.app",
      gradient: "from-[#FF00FF] to-[#EE82EE]",
      accentColor: "#FF00FF"
    },
    {
      id: 4,
      title: "Advanced Operations",
      description: "Bulk transfers, multi-signature wallets, and comprehensive account management solutions for power users.",
      icon: Users,
      link: "https://multisender-creator.vercel.app",
      gradient: "from-[#EE82EE] to-[#8A2BE2]",
      accentColor: "#EE82EE"
    }
  ];

  const handleCardClick = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 pb-16">
      <div className="max-w-7xl mx-auto w-full">
        {/* Hero Header */}
        <div className="text-center mb-16 relative">
          <div className="relative inline-block">
            <h1 className="text-7xl sm:text-8xl lg:text-9xl font-bold mb-6 font-rajdhani">
              <span className="bg-gradient-to-r from-[#8A2BE2] via-[#BF40BF] to-[#FF00FF] bg-clip-text text-transparent animate-gradient">
                Orvium
              </span>
            </h1>
            <div className="absolute -top-6 -right-6 text-[#FF00FF] animate-spin">
              <Sparkles size={40} />
            </div>
            <div className="absolute -bottom-2 -left-4 text-[#8A2BE2] animate-pulse">
              <div className="w-3 h-3 bg-[#8A2BE2] rounded-full"></div>
            </div>
          </div>
          
          <p className="text-2xl sm:text-3xl text-[#E0E0E0] mb-4 font-poppins font-light">
            Smart Tools for Rise Chain
          </p>
          
          <p className="text-lg sm:text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed font-poppins">
            Transform your Rise Chain experience with the ultimate chatbot platform. 
            Intelligent operations, secure transfers, and advanced tools for a new era in blockchain.
          </p>
        </div>

        {/* Main Feature Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className="group relative bg-gradient-to-br from-black/60 via-black/40 to-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-700 transform hover:scale-105 hover:shadow-2xl cursor-pointer overflow-hidden"
              onClick={() => handleCardClick(feature.link)}
              style={{
                boxShadow: `0 0 0 1px ${feature.accentColor}20, 0 20px 40px -12px ${feature.accentColor}30`
              }}
            >
              {/* Animated background glow */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-700 rounded-3xl`}
              ></div>
              
              {/* Floating particles */}
              <div className="absolute top-4 right-4 w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-bounce"
                   style={{ backgroundColor: feature.accentColor }}></div>
              <div className="absolute bottom-6 left-6 w-1 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"
                   style={{ backgroundColor: feature.accentColor }}></div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className={`mb-6 p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} w-fit group-hover:scale-110 transition-transform duration-500 shadow-lg`}>
                  <feature.icon size={32} className="text-white" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text transition-all duration-500 font-rajdhani"
                    style={{ backgroundImage: `linear-gradient(to right, ${feature.accentColor}, #FF00FF)` }}>
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-300 text-base leading-relaxed mb-6 font-poppins group-hover:text-gray-200 transition-colors duration-300">
                  {feature.description}
                </p>
                
                {/* Action indicator */}
                <div className="flex items-center text-sm font-semibold transition-all duration-300 group-hover:translate-x-2"
                     style={{ color: feature.accentColor }}>
                  <span>Explore Now</span>
                  <ArrowRight size={16} className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>

              {/* Corner accent */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${feature.gradient} opacity-5 rounded-bl-3xl`}></div>
              
              {/* Border glow effect */}
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                   style={{ 
                     background: `linear-gradient(45deg, transparent, ${feature.accentColor}20, transparent)`,
                     padding: '2px'
                   }}>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-4 text-[#8A2BE2] mb-8">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#8A2BE2]"></div>
            <div className="w-3 h-3 bg-[#8A2BE2] rounded-full animate-pulse"></div>
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#8A2BE2]"></div>
          </div>
          
          <p className="text-gray-400 text-lg font-poppins">
            Powered by Rise Chain Technology
          </p>
        </div>
      </div>
    </section>
  );
};

export default MainSection;