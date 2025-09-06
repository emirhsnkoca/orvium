import React from 'react';
import homepageVideo from '../assets/videos/homepage_bg.mp4';
import orviumLogo from '../assets/nobg_orvium.png';

const HomePage: React.FC = () => {
  return (
    <section className="relative h-screen w-full">
      {/* Video Background */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={homepageVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Video Overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/30"></div>
      
      {/* Main Content */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="text-center" style={{ transform: 'translateY(-5vh)' }}>
          {/* Logo */}
          <div className="mb-8">
            <img 
              src={orviumLogo} 
              alt="Orvium Logo" 
              className="w-128 h-128 sm:w-160 sm:h-160 lg:w-192 lg:h-192 mx-auto drop-shadow-2xl"
              style={{
                width: '32rem',
                height: '32rem',
                transform: 'translateY(5vh)'
              }}
            />
          </div>
          
          {/* ORVIUM Title */}
          <h1 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-black mb-6 font-orbitron">
            <span className="bg-gradient-to-r from-[#8A2BE2] to-[#FF00FF] bg-clip-text text-transparent animate-purple-pink-flow tracking-widest uppercase drop-shadow-2xl">
              ORVIUM
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg sm:text-xl lg:text-2xl bg-gradient-to-r from-gray-400 to-white bg-clip-text text-transparent font-orbitron font-medium tracking-wide uppercase">
            Tool Center Supported by AI
          </p>
        </div>
      </div>
    </section>
  );
};

export default HomePage;
