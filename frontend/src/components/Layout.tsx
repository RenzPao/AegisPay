import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Github, Twitter, Globe } from 'lucide-react';

// ── Navbar ───────────────────────────────────────────────────
interface NavbarProps { activeSection: string; onNav: (s: string) => void; }
export function Navbar({ activeSection, onNav }: NavbarProps) {
  return (
    <nav className="navbar" aria-label="Primary navigation">
      <div className="navbar-inner">
        {/* Logo */}
        <a href="#hero" className="nav-logo" onClick={() => onNav('hero')} aria-label="AegisPay home">
          <div className="nav-logo-icon" aria-hidden="true">
            <Shield size={20} color="#000" strokeWidth={2.5} />
          </div>
          <span className="nav-logo-text">AegisPay</span>
        </a>

        {/* Links */}
        <ul className="nav-links" role="list">
          {[
            { id: 'features', label: 'Features' },
            { id: 'how-it-works', label: 'How It Works' },
            { id: 'claim', label: 'Claim Wages' },
          ].map(({ id, label }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className={`nav-link${activeSection === id ? ' active' : ''}`}
                onClick={(e) => { e.preventDefault(); onNav(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }}
                aria-current={activeSection === id ? 'page' : undefined}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a href="#claim" className="btn btn-primary nav-cta" style={{ padding: '10px 22px', fontSize: '0.9rem', minHeight: 40 }}
          onClick={(e) => { e.preventDefault(); document.getElementById('claim')?.scrollIntoView({ behavior: 'smooth' }); }}
        >
          Claim Wages
        </a>
      </div>
    </nav>
  );
}

// ── Footer ───────────────────────────────────────────────────
export function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="nav-logo-icon" aria-hidden="true">
              <Shield size={16} color="#000" strokeWidth={2.5} />
            </div>
            <span className="footer-copy">
              © 2026 AegisPay · Privacy-preserving payroll on Stellar
            </span>
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link" aria-label="GitHub repository">
              <Github size={16} />
            </a>
            <a href="#" className="footer-link" aria-label="Twitter / X">
              <Twitter size={16} />
            </a>
            <a href="#" className="footer-link" aria-label="Website">
              <Globe size={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
