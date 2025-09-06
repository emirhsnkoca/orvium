import React from 'react';
import homepageVideo from '../assets/videos/homepage_bg.mp4';

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
      
      {/* Content will be added later */}
      <div className="relative z-10 h-full flex items-center justify-center">
        {/* Content placeholder - will be added in next part */}
      </div>
    </section>
  );
};

export default HomePage;
