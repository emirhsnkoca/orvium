import React, { useState } from 'react';
import Navbar from './components/Navbar';
import MainSection from './components/MainSection';
import Footer from './components/Footer';
import RaiseModal from './components/RaiseModal';
import AnimatedBackground from './components/AnimatedBackground';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F1A] via-[#1A1A2E] to-[#0F0F1A] text-white overflow-hidden relative">
      <AnimatedBackground />
      
      <div className="relative z-10">
        <Navbar onRaiseClick={openModal} />
        <MainSection />
        <Footer />
      </div>

      <RaiseModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}

export default App;