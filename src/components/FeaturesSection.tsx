import React, { useState } from 'react';
import { ArrowRightLeft, Shield, Droplets, Users, ArrowRight, X } from 'lucide-react';

const FeaturesSection: React.FC = () => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  
  const features = [
    {
      id: 1,
      title: "Smart Swap & Transfer",
      description: "Instantly and securely swap or send your assets with intelligent automation and real-time market analysis.",
      icon: ArrowRightLeft,
      link: "https://swap-transfer.vercel.app",
      gradient: "from-[#8A2BE2] to-[#BF40BF]",
      accentColor: "#8A2BE2",
      image: "src/assets/images/swap-transfer.jpg"
    },
    {
      id: 2,
      title: "Security Guardian",
      description: "Advanced phishing detection system that instantly identifies suspicious contract addresses and protects your assets.",
      icon: Shield,
      link: "https://phishing-detector.vercel.app",
      gradient: "from-[#BF40BF] to-[#FF00FF]",
      accentColor: "#BF40BF",
      image: "src/assets/images/security-guardian.jpg"
    },
    {
      id: 3,
      title: "Testnet Faucet Hub",
      description: "Quick and easy access to testnet tokens for developers. Multiple networks supported with instant distribution.",
      icon: Droplets,
      link: "https://pov-faucet.vercel.app",
      gradient: "from-[#FF00FF] to-[#EE82EE]",
      accentColor: "#FF00FF",
      image: "src/assets/images/faucet-hub.jpg"
    },
    {
      id: 4,
      title: "Advanced Operations",
      description: "Bulk transfers, multi-signature wallets, and comprehensive account management solutions for power users.",
      icon: Users,
      link: "https://multisender-creator.vercel.app",
      gradient: "from-[#EE82EE] to-[#8A2BE2]",
      accentColor: "#EE82EE",
      image: "src/assets/images/advanced-operations.jpg"
    }
  ];

  return (
    <section id="features" style={{ height: '150vh' }} className="flex flex-col items-center justify-center px-8 py-16 bg-gradient-to-br from-[#0F0F1A] via-[#1A1A2E] to-[#0F0F1A] overflow-hidden">
      <div className="w-full max-w-7xl mx-auto">
        {/* Features Header */}
        <div className="text-center mb-16">
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
              className={`relative group cursor-pointer overflow-hidden transition-all duration-700 ease-in-out ${
                hoveredCard === feature.id ? 'transform scale-105' : ''
              }`}
              onMouseEnter={() => setHoveredCard(feature.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                height: hoveredCard === feature.id ? '500px' : '350px',
              }}
            >
              {/* Main Card Container */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
                {/* Background Image */}
                <div 
                  className="absolute inset-0 transition-all duration-700"
                  style={{
                    backgroundImage: `url('${feature.image}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  {/* Fallback Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-60`}></div>
                  
                  {/* Dark Overlay for Text Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                </div>

                {/* Fallback Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <feature.icon size={150} className="text-white" />
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
                    <h3 className="text-3xl font-bold text-white font-playfair drop-shadow-2xl leading-tight">
                      {feature.title}
                    </h3>

                    {/* Description - Only show on hover */}
                    <div 
                      className={`transition-all duration-700 overflow-hidden ${
                        hoveredCard === feature.id 
                          ? 'max-h-32 opacity-100 transform translate-y-0' 
                          : 'max-h-0 opacity-0 transform translate-y-4'
                      }`}
                    >
                      <p className="text-gray-200 text-lg leading-relaxed font-playfair">
                        {feature.description}
                      </p>
                    </div>

                    {/* Elegant Accent Line */}
                    <div 
                      className={`transition-all duration-700 ${
                        hoveredCard === feature.id ? 'w-24 opacity-100' : 'w-12 opacity-60'
                      } h-1 rounded-full`}
                      style={{ backgroundColor: feature.accentColor }}
                    ></div>
                  </div>
                </div>

                {/* Elegant Border Glow */}
                <div 
                  className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-700 ${
                    hoveredCard === feature.id ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ 
                    boxShadow: `inset 0 0 0 2px ${feature.accentColor}40, 0 0 40px ${feature.accentColor}20`
                  }}
                ></div>

                {/* Subtle Inner Glow */}
                <div 
                  className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-700 ${
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
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-4 text-[#8A2BE2] mb-8">
            <div className="w-20 h-px bg-gradient-to-r from-transparent to-[#8A2BE2]"></div>
            <div className="w-4 h-4 bg-[#8A2BE2] rounded-full animate-pulse"></div>
            <div className="w-20 h-px bg-gradient-to-l from-transparent to-[#8A2BE2]"></div>
          </div>
          
          <p className="text-gray-400 text-xl font-orbitron tracking-wider">
            Powered by Rise Chain Technology
          </p>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
