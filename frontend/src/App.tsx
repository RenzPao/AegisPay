import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { Navbar, Footer } from './components/Layout';
import { HeroSection, FeaturesSection, HowItWorksSection } from './components/Sections';
import { ClaimSection } from './components/ClaimForm';
import { ToastArea, useToast } from './components/Toast';
import { WalletProvider } from './context/WalletContext';
import EmployerDashboard from './pages/EmployerDashboard';
import WithdrawPage from './pages/WithdrawPage';
import PitchDeck from './pages/PitchDeck';
import NotFound from './pages/NotFound';

function LandingPage() {
  const [activeSection, setActiveSection] = useState('hero');
  const { toasts, dismiss, success, error, info } = useToast();

  useEffect(() => {
    const sections = ['hero', 'features', 'how-it-works', 'claim'];
    const observers: IntersectionObserver[] = [];

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.35, rootMargin: '-60px 0px 0px 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollToClaim = () => {
    document.getElementById('claim')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Navbar activeSection={activeSection} onNav={setActiveSection} />
      <main id="main-content" tabIndex={-1}>
        <HeroSection onClaim={scrollToClaim} />
        <div className="container"><div className="divider" /></div>
        <FeaturesSection />
        <div className="container"><div className="divider" /></div>
        <HowItWorksSection />
        <div className="container"><div className="divider" /></div>
        <ClaimSection notify={(type, title, msg) => {
          if (type === 'success') success(title, msg);
          else if (type === 'error') error(title, msg);
          else info(title, msg);
        }} />
      </main>
      <Footer />
      <ToastArea toasts={toasts} dismiss={dismiss} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <WalletProvider>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/employer" element={<EmployerDashboard />} />
          <Route path="/withdraw" element={<WithdrawPage />} />
          <Route path="/pitchdeck" element={<PitchDeck />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </WalletProvider>
    </BrowserRouter>
  );
}
