import React from 'react';
import { Menu, X } from 'lucide-react';
import orviumLogo from '../assets/nobg_orvium.png';

interface NavbarProps {
  onRaiseClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onRaiseClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent border-b border-[#8A2BE2]/10">
      <div className="max-w-full mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <button 
            onClick={scrollToTop}
            className="flex items-center space-x-4 cursor-pointer"
          >
            <img src={orviumLogo} alt="Orvium Logo" className="w-14 h-14 drop-shadow-lg" />
            <h1 className="text-4xl font-black bg-gradient-to-r from-[#8A2BE2] to-[#FF00FF] bg-clip-text text-transparent font-orbitron animate-purple-pink-flow tracking-widest uppercase drop-shadow-2xl">
              ORVIUM
            </h1>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-12">
              <button
                onClick={scrollToTop}
                className="text-white hover:text-[#FF00FF] transition-all duration-300 font-orbitron font-medium tracking-wide hover:animate-text-glow uppercase"
              >
                HOME
              </button>
              <button
                onClick={scrollToFeatures}
                className="text-white hover:text-[#FF00FF] transition-all duration-300 font-orbitron font-medium tracking-wide hover:animate-text-glow uppercase"
              >
                FEATURES
              </button>
            </div>
          </div>

          {/* rAIse Button */}
          <div className="hidden md:block">
            <button
              onClick={onRaiseClick}
              className="relative bg-gradient-to-r from-[#8A2BE2] to-[#FF00FF] hover:from-[#FF00FF] hover:to-[#8A2BE2] text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-[#8A2BE2]/30 font-orbitron tracking-wide uppercase text-base border-2 border-black hover:border-black backdrop-blur-sm"
            >
              RISE AI
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:text-[#BF40BF] transition-colors duration-300"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black/90 backdrop-blur-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <button
              onClick={scrollToTop}
              className="block text-white hover:text-[#FF00FF] px-3 py-2 transition-all duration-300 font-orbitron font-medium tracking-wide hover:animate-text-glow uppercase w-full text-left"
            >
              HOME
            </button>
            <button
              onClick={scrollToFeatures}
              className="block text-white hover:text-[#FF00FF] px-3 py-2 transition-all duration-300 font-orbitron font-medium tracking-wide w-full text-left hover:animate-text-glow uppercase"
            >
              FEATURES
            </button>
            <button
              onClick={onRaiseClick}
              className="block w-full text-left bg-gradient-to-r from-[#8A2BE2] to-[#FF00FF] hover:from-[#FF00FF] hover:to-[#8A2BE2] text-white px-3 py-2 rounded-xl font-bold transition-all duration-300 font-orbitron mx-3 my-2 tracking-wide uppercase border-2 border-black"
            >
              RISE AI
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;