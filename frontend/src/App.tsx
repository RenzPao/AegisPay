import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './index.css';
import { Navbar, Footer } from './components/Layout';
import { HeroSection, FeaturesSection, HowItWorksSection } from './components/Sections';
import { ClaimSection } from './components/ClaimForm';
import { ToastArea, useToast } from './components/Toast';

export default function App() {
  const [activeSection, setActiveSection] = useState('hero');
  const { toasts, dismiss, success, error, info } = useToast();
  const claimRef = useRef<HTMLElement | null>(null);

  // Intersection observer for active nav link
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
      {/* Skip to main content link for keyboard users */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Fixed Navbar */}
      <Navbar activeSection={activeSection} onNav={setActiveSection} />

      {/* Main content */}
      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <HeroSection onClaim={scrollToClaim} />

        {/* Divider */}
        <div className="container"><div className="divider" /></div>

        {/* Features */}
        <FeaturesSection />

        {/* Divider */}
        <div className="container"><div className="divider" /></div>

        {/* How It Works */}
        <HowItWorksSection />

        {/* Divider */}
        <div className="container"><div className="divider" /></div>

        {/* Claim Form (Phase 4 UI) */}
        <ClaimSection notify={(type, title, msg) => {
          if (type === 'success') success(title, msg);
          else if (type === 'error') error(title, msg);
          else info(title, msg);
        }} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Toast notifications */}
      <ToastArea toasts={toasts} dismiss={dismiss} />
    </>
  );
}
