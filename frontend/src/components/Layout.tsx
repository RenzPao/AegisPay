import React from 'react';
import { Shield, Code, MessageCircle, Globe } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import WalletPanel from './WalletPanel';

// ── Navbar ───────────────────────────────────────────────────
interface NavbarProps { activeSection: string; onNav: (s: string) => void; }
export function Navbar({ activeSection, onNav }: NavbarProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  return (
    <nav className="navbar" aria-label="Primary navigation">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="nav-logo" onClick={() => isHome && onNav('hero')} aria-label="AegisPay home">
          <div className="nav-logo-icon" aria-hidden="true">
            <Shield size={20} color="#000" strokeWidth={2.5} />
          </div>
          <span className="nav-logo-text">AegisPay</span>
        </Link>

        {/* Links */}
        <ul className="nav-links" role="list">
          {[
            { id: 'features', label: 'Features' },
            { id: 'how-it-works', label: 'How It Works' },
            { id: 'claim', label: 'Claim Wages' },
          ].map(({ id, label }) => (
            <li key={id}>
              {isHome ? (
                <a
                  href={`#${id}`}
                  className={`nav-link${activeSection === id ? ' active' : ''}`}
                  onClick={(e) => { e.preventDefault(); onNav(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }}
                  aria-current={activeSection === id ? 'page' : undefined}
                >
                  {label}
                </a>
              ) : (
                <Link to={`/#${id}`} className="nav-link">
                  {label}
                </Link>
              )}
            </li>
          ))}
          <li>
            <Link to="/employer" className={`nav-link${location.pathname === '/employer' ? ' active' : ''}`}>
              Employer
            </Link>
          </li>
        </ul>

        {/* Wallet CTA */}
        <WalletPanel />
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
              <Code size={16} />
            </a>
            <a href="#" className="footer-link" aria-label="Twitter / X">
              <MessageCircle size={16} />
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
