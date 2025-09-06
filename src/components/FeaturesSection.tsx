import React, { useState } from 'react';
import { ArrowRightLeft, Shield, Droplets, Users, ArrowRight, X } from 'lucide-react';

const FeaturesSection: React.FC = () => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  
  const features: Array<{
    id: number;
    title: string;
    displayTitle?: string;
    description: string;
    icon: any;
    link: string;
    gradient: string;
    accentColor: string;
    image: string;
  }> = [
    {
      id: 1,
      title: "Smart Swap & Transfer",
      displayTitle: "Smart <span class='gold-luxury'>Swap</span> & <span class='gold-luxury'>Transfer</span>",
      description: "Instantly and securely swap or send your assets with intelligent automation and real-time market analysis.",
      icon: ArrowRightLeft,
      link: "https://swap-transfer.vercel.app",
      gradient: "from-[#8A2BE2] to-[#BF40BF]",
      accentColor: "#8A2BE2",
      image: "src/assets/images/swap.png"
    },
    {
      id: 2,
      title: "Security Guardian",
      displayTitle: "<span class='gold-luxury'>Security</span> Guardian",
      description: "Advanced phishing detection system that instantly identifies suspicious contract addresses and protects your assets.",
      icon: Shield,
      link: "https://phishing-detector.vercel.app",
      gradient: "from-[#BF40BF] to-[#FF00FF]",
      accentColor: "#BF40BF",
      image: "src/assets/images/phising.png"
    },
    {
      id: 3,
      title: "Testnet Faucet Hub",
      displayTitle: "Testnet <span class='gold-luxury'>Faucet</span> Hub",
      description: "Quick and easy access to testnet tokens for developers. Multiple networks supported with instant distribution.",
      icon: Droplets,
      link: "https://pov-faucet.vercel.app",
      gradient: "from-[#FF00FF] to-[#EE82EE]",
      accentColor: "#FF00FF",
      image: "src/assets/images/faucet.png"
    },
    {
      id: 4,
      title: "Advanced Operations",
      displayTitle: "<span class='gold-luxury'>Advanced Operations</span>",
      description: "Bulk transfers, multi-signature wallets, and comprehensive account management solutions for power users.",
      icon: Users,
      link: "https://multisender-creator.vercel.app",
      gradient: "from-[#EE82EE] to-[#8A2BE2]",
      accentColor: "#EE82EE",
      image: "src/assets/images/advanced.png"
    }
  ];

  return (
    <section id="features" className="min-h-screen flex flex-col items-center justify-start px-8 py-8 overflow-hidden relative" style={{ 
      background: `
        radial-gradient(circle at 25% 25%, rgba(138, 43, 226, 0.1) 0%, transparent 60%),
        radial-gradient(circle at 75% 75%, rgba(191, 64, 191, 0.08) 0%, transparent 60%),
        linear-gradient(135deg, #000000 0%, #0f0f1a 50%, #000000 100%)
      `
    }}>
      {/* Static Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Static Glow Effects */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-40 h-40 bg-[#8A2BE2] rounded-full opacity-3 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-32 h-32 bg-[#FF00FF] rounded-full opacity-2 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-[#BF40BF] rounded-full opacity-2 blur-3xl"></div>
        </div>
      </div>
      
      <div className="w-full max-w-7xl mx-auto relative z-10">
        {/* Features Header */}
        <div className="text-center mb-8 mt-8">
          <h2 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-8 font-orbitron">
            <span className="bg-gradient-to-r from-[#8A2BE2] via-[#BF40BF] to-[#FF00FF] bg-clip-text text-transparent animate-gradient uppercase tracking-wider">
              FEATURES
            </span>
          </h2>
        </div>

        {/* 2x2 Elegant Grid */}
        <div className="grid grid-cols-2 gap-6 w-full">
          {features.map((feature, index) => (
                        <div
                          key={feature.id}
                          className={`relative group cursor-pointer overflow-hidden transition-all duration-200 ease-out will-change-transform ${
                            hoveredCard === feature.id ? 'transform scale-102' : ''
                          }`}
                          onMouseEnter={() => setHoveredCard(feature.id)}
                          onMouseLeave={() => setHoveredCard(null)}
                          style={{
                            height: hoveredCard === feature.id ? '500px' : '350px',
                            transform: hoveredCard === feature.id ? 'scale(1.02)' : 'scale(1)',
                          }}
            >
              {/* Main Card Container */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
                            {/* Background Image */}
                            <div 
                              className="absolute inset-0 transition-all duration-200 will-change-transform"
                              style={{
                                backgroundImage: `url('${feature.image}')`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat'
                              }}
                >
                  {/* Dark Overlay for Text Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                </div>

                {/* Card Content */}
                <div className="relative z-10 h-full flex flex-col justify-between p-8">
                  {/* Top Section - Icon */}
                  <div className="flex justify-end">
                    <div 
                      className="p-3 rounded-full backdrop-blur-sm border border-white/20"
                      style={{ backgroundColor: `${feature.accentColor}20` }}
                    >
                      <feature.icon size={32} className="text-white" />
                    </div>
                  </div>

                  {/* Bottom Section - Title & Description */}
                  <div className="space-y-4">
                    {/* Title */}
                    <h3 
                      className="text-3xl font-bold text-white font-rajdhani drop-shadow-2xl leading-tight"
                      dangerouslySetInnerHTML={{ __html: feature.displayTitle || feature.title }}
                    ></h3>

                                {/* Description - Only show on hover */}
                                <div 
                                  className={`transition-all duration-200 ease-out overflow-hidden will-change-transform ${
                                    hoveredCard === feature.id 
                                      ? 'max-h-32 opacity-100 transform translate-y-0' 
                                      : 'max-h-0 opacity-0 transform translate-y-1'
                                  }`}
                    >
                      <p className="text-gray-200 text-lg leading-relaxed font-rajdhani">
                        {feature.description}
                      </p>
                    </div>

                                {/* Elegant Accent Line */}
                                <div 
                                  className={`transition-all duration-200 ease-out will-change-transform ${
                                    hoveredCard === feature.id ? 'w-24 opacity-100' : 'w-12 opacity-60'
                                  } h-1 rounded-full`}
                                  style={{ backgroundColor: feature.accentColor }}
                    ></div>
                  </div>
                </div>

                            {/* Elegant Border Glow */}
                            <div 
                              className={`absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-200 ease-out ${
                                hoveredCard === feature.id ? 'opacity-100' : 'opacity-0'
                              }`}
                              style={{ 
                                boxShadow: `inset 0 0 0 2px ${feature.accentColor}40, 0 0 40px ${feature.accentColor}20`
                              }}
                ></div>

                            {/* Subtle Inner Glow */}
                            <div 
                              className={`absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-200 ease-out ${
                                hoveredCard === feature.id ? 'opacity-30' : 'opacity-0'
                              }`}
                              style={{ 
                                background: `radial-gradient(circle at center, ${feature.accentColor}10 0%, transparent 70%)`
                              }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-transparent text-lg font-orbitron tracking-wider">
            &nbsp;
          </p>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
