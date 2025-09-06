import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import FeaturesSection from './components/FeaturesSection';
import Footer from './components/Footer';
import RaiseModal from './components/RaiseModal';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="text-white">
      <Navbar onRaiseClick={openModal} />
      
      {/* Full-screen sections */}
      <HomePage />
      <FeaturesSection />
      <Footer />

      <RaiseModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}

export default App;