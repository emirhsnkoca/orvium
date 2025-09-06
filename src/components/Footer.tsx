import React from 'react';
import { Github, Twitter, Globe } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-[#8A2BE2]/20 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center space-y-8">
          {/* Logo */}
          <div className="text-center">
            <h3 className="text-3xl font-bold bg-gradient-to-r from-[#8A2BE2] to-[#FF00FF] bg-clip-text text-transparent font-rajdhani mb-2">
              Orvium
            </h3>
            <p className="text-gray-400 font-poppins">Rise Chain için Akıllı Araçlar</p>
            <p className="text-gray-400 font-poppins">Smart Tools for Rise Chain</p>
          </div>

          {/* Social Links */}
          <div className="flex space-x-6">
            <a
              href="#"
              className="text-gray-400 hover:text-[#BF40BF] transition-all duration-300 transform hover:scale-110 p-2 rounded-lg hover:bg-[#8A2BE2]/10"
            >
              <Github size={24} />
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-[#BF40BF] transition-all duration-300 transform hover:scale-110 p-2 rounded-lg hover:bg-[#8A2BE2]/10"
            >
              <Twitter size={24} />
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-[#BF40BF] transition-all duration-300 transform hover:scale-110 p-2 rounded-lg hover:bg-[#8A2BE2]/10"
            >
              <Globe size={24} />
            </a>
          </div>

          {/* Divider */}
          <div className="w-full flex items-center justify-center">
            <div className="w-32 h-px bg-gradient-to-r from-transparent via-[#8A2BE2] to-transparent"></div>
          </div>

          {/* Copyright */}
          <div className="text-center">
            <p className="text-gray-400 text-sm font-poppins">
              © 2024 Orvium. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs mt-2 font-poppins">
              Trusted partner of Rise Chain ecosystem
            </p>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <div className="w-4 h-4 bg-gradient-to-r from-[#8A2BE2] to-[#FF00FF] rounded-full animate-pulse"></div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;