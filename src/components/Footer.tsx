import React from 'react';
import { Youtube } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer 
      className="py-8 px-4 sm:px-6 lg:px-8 border-t border-[#8A2BE2]/10 relative overflow-hidden"
      style={{ 
        background: `
          radial-gradient(circle at 25% 25%, rgba(138, 43, 226, 0.1) 0%, transparent 60%),
          radial-gradient(circle at 75% 75%, rgba(191, 64, 191, 0.08) 0%, transparent 60%),
          linear-gradient(135deg, #000000 0%, #0f0f1a 50%, #000000 100%)
        `
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content - Horizontal Layout */}
        <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
          
          {/* Left Section - Logo & Description */}
          <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-3 lg:space-y-0 lg:space-x-6">
            <h3 className="text-3xl font-black bg-gradient-to-r from-[#8A2BE2] to-[#FF00FF] bg-clip-text text-transparent font-rajdhani animate-purple-pink-flow tracking-widest uppercase drop-shadow-2xl">
              ORVIUM
            </h3>
            <div className="hidden lg:block w-px h-10 bg-gradient-to-b from-[#8A2BE2] via-[#BF40BF] to-transparent opacity-60"></div>
            <p className="text-gray-300 font-rajdhani text-center lg:text-left font-medium tracking-wide uppercase text-lg">
              SMART TOOLS FOR RISE CHAIN ECOSYSTEM
            </p>
          </div>

          {/* Center Section - Social Links */}
          <div className="flex space-x-2">
            {/* X (Twitter) */}
            <a
              href="https://x.com/0xorvium"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#FF00FF] transition-all duration-200 transform hover:scale-110 p-3 rounded-xl hover:bg-gradient-to-r hover:from-[#8A2BE2]/20 hover:to-[#FF00FF]/20 backdrop-blur-sm border border-transparent hover:border-[#8A2BE2]/30 hover:shadow-lg hover:shadow-[#8A2BE2]/20"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            {/* YouTube */}
            <a
              href="https://www.youtube.com/@0xorvium"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#FF00FF] transition-all duration-200 transform hover:scale-110 p-3 rounded-xl hover:bg-gradient-to-r hover:from-[#8A2BE2]/20 hover:to-[#FF00FF]/20 backdrop-blur-sm border border-transparent hover:border-[#8A2BE2]/30 hover:shadow-lg hover:shadow-[#8A2BE2]/20"
            >
              <Youtube size={22} />
            </a>
          </div>

          {/* Right Section - Copyright */}
          <div className="text-center lg:text-right">
            <p className="text-gray-300 text-sm font-rajdhani font-medium tracking-wide">
              © 2025 Orvium. All rights reserved.
            </p>
            <p className="text-gray-400 text-sm mt-1 font-rajdhani font-medium tracking-wide uppercase">
              Tool Center Supported by AI
            </p>
          </div>
        </div>


        {/* Static Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-4 left-4 w-20 h-20 bg-[#8A2BE2] rounded-full opacity-5 blur-2xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#BF40BF] rounded-full opacity-3 blur-3xl"></div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;