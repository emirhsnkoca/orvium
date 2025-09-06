import React from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onRaiseClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onRaiseClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-lg border-b border-[#8A2BE2]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#8A2BE2] to-[#FF00FF] bg-clip-text text-transparent font-rajdhani">
              Orvium
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#" className="text-white hover:text-[#BF40BF] transition-colors duration-300 font-poppins">
                Home
              </a>
              <button
                onClick={scrollToFeatures}
                className="text-white hover:text-[#BF40BF] transition-colors duration-300 font-poppins"
              >
                Features
              </button>
            </div>
          </div>

          {/* rAIse Button */}
          <div className="hidden md:block">
            <button
              onClick={onRaiseClick}
              className="bg-gradient-to-r from-[#8A2BE2] to-[#BF40BF] hover:from-[#BF40BF] hover:to-[#FF00FF] text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-[#8A2BE2]/25 font-poppins"
            >
              rAIse
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
            <a href="#" className="block text-white hover:text-[#BF40BF] px-3 py-2 transition-colors duration-300 font-poppins">
              Home
            </a>
            <button
              onClick={scrollToFeatures}
              className="block text-white hover:text-[#BF40BF] px-3 py-2 transition-colors duration-300 font-poppins w-full text-left"
            >
              Features
            </button>
            <button
              onClick={onRaiseClick}
              className="block w-full text-left bg-gradient-to-r from-[#8A2BE2] to-[#BF40BF] text-white px-3 py-2 rounded-lg font-semibold transition-all duration-300 font-poppins mx-3 my-2"
            >
              rAIse
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;