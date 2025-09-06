import React from 'react';
import { Github, Twitter, Globe } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer 
      className="py-6 px-4 sm:px-6 lg:px-8 border-t border-[#8A2BE2]/20 relative"
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
          <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-2 lg:space-y-0 lg:space-x-4">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-[#8A2BE2] to-[#FF00FF] bg-clip-text text-transparent font-rajdhani">
              ORVIUM
            </h3>
            <div className="hidden lg:block w-px h-8 bg-gradient-to-b from-[#8A2BE2] to-transparent"></div>
            <p className="text-gray-400 font-rajdhani text-center lg:text-left">
              Smart Tools for Rise Chain Ecosystem
            </p>
          </div>

          {/* Center Section - Social Links */}
          <div className="flex space-x-4">
            <a
              href="#"
              className="text-gray-400 hover:text-[#BF40BF] transition-all duration-200 transform hover:scale-110 p-2 rounded-lg hover:bg-[#8A2BE2]/10"
            >
              <Github size={20} />
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-[#BF40BF] transition-all duration-200 transform hover:scale-110 p-2 rounded-lg hover:bg-[#8A2BE2]/10"
            >
              <Twitter size={20} />
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-[#BF40BF] transition-all duration-200 transform hover:scale-110 p-2 rounded-lg hover:bg-[#8A2BE2]/10"
            >
              <Globe size={20} />
            </a>
          </div>

          {/* Right Section - Copyright */}
          <div className="text-center lg:text-right">
            <p className="text-gray-400 text-sm font-rajdhani">
              © 2024 Orvium. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs mt-1 font-rajdhani">
              Powered by Rise Chain Technology
            </p>
          </div>
        </div>

        {/* Bottom Accent Line */}
        <div className="mt-4 pt-4 border-t border-[#8A2BE2]/10">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-[#8A2BE2]"></div>
              <div className="w-2 h-2 bg-[#8A2BE2] rounded-full opacity-60"></div>
              <div className="w-8 h-px bg-gradient-to-l from-transparent to-[#8A2BE2]"></div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;