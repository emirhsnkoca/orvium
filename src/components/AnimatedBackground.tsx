import React from 'react';

const AnimatedBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient with multiple layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0F] via-[#1A0B2E] to-[#0F0A1A]"></div>
      
      {/* Animated gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#8A2BE2]/20 via-transparent to-[#FF00FF]/20 animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-[#BF40BF]/10 to-transparent animate-pulse delay-1000"></div>
      
      {/* Large floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-radial from-[#8A2BE2]/30 to-transparent rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-radial from-[#FF00FF]/25 to-transparent rounded-full blur-3xl animate-float delay-2000"></div>
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-radial from-[#BF40BF]/20 to-transparent rounded-full blur-2xl animate-float delay-3000"></div>
      
      {/* Geometric patterns */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30">
        <div className="absolute top-1/4 left-1/2 w-px h-32 bg-gradient-to-b from-transparent via-[#8A2BE2] to-transparent transform -rotate-45 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-px h-24 bg-gradient-to-b from-transparent via-[#FF00FF] to-transparent transform rotate-45 animate-pulse delay-500"></div>
        <div className="absolute bottom-1/4 left-1/3 w-px h-28 bg-gradient-to-b from-transparent via-[#BF40BF] to-transparent transform -rotate-12 animate-pulse delay-1000"></div>
      </div>
      
      {/* Floating particles with varied sizes */}
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className={`absolute rounded-full animate-bounce ${
            i % 3 === 0 ? 'w-2 h-2 bg-[#8A2BE2]' :
            i % 3 === 1 ? 'w-1.5 h-1.5 bg-[#FF00FF]' :
            'w-1 h-1 bg-[#BF40BF]'
          }`}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        ></div>
      ))}
      
      {/* Neon grid lines */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/6 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#8A2BE2]/60 to-transparent animate-pulse"></div>
        <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FF00FF]/60 to-transparent animate-pulse delay-1000"></div>
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-[#BF40BF]/40 to-transparent animate-pulse delay-500"></div>
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-[#8A2BE2]/40 to-transparent animate-pulse delay-1500"></div>
      </div>
      
      {/* Corner accent glows */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-[#8A2BE2]/15 via-[#8A2BE2]/5 to-transparent rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-[#FF00FF]/15 via-[#FF00FF]/5 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
      
      {/* Moving light streaks */}
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#BF40BF]/80 to-transparent transform -skew-y-12 animate-pulse opacity-60"></div>
      <div className="absolute top-2/3 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#8A2BE2]/60 to-transparent transform skew-y-6 animate-pulse delay-1000 opacity-40"></div>
    </div>
  );
};

export default AnimatedBackground;