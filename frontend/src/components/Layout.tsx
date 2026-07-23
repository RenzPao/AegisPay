import React, { useState } from 'react';
import { Shield, Code, MessageCircle, Globe, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import WalletPanel from './WalletPanel';

// "?"? Navbar "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
interface NavbarProps { activeSection: string; onNav: (s: string) => void; }
export function Navbar({ activeSection, onNav }: NavbarProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleNavClick = (id: string, isHashLink: boolean) => {
    setIsMobileMenuOpen(false);
    if (isHashLink && isHome) {
      onNav(id);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'claim', label: 'Claim Wages' },
  ];

  return (
    <nav className="navbar" aria-label="Primary navigation">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="nav-logo" onClick={() => handleNavClick('hero', true)} aria-label="AegisPay home">
          <div className="nav-logo-icon" aria-hidden="true">
            <Shield size={20} color="#000" strokeWidth={2.5} />
          </div>
          <span className="nav-logo-text">AegisPay</span>
        </Link>

        {/* Desktop Links */}
        <ul className="nav-links desktop-only" role="list">
          {navItems.map(({ id, label }) => (
            <li key={id}>
              {isHome ? (
                <a
                  href={`#${id}`}
                  className={`nav-link${activeSection === id ? ' active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleNavClick(id, true); }}
                  aria-current={activeSection === id ? 'page' : undefined}
                >
                  {label}
                </a>
              ) : (
                <Link to={`/#${id}`} className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                  {label}
                </Link>
              )}
            </li>
          ))}
          <li>
            <Link to="/employer" className={`nav-link${location.pathname === '/employer' ? ' active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
              Employer
            </Link>
          </li>
        </ul>

        <div className="nav-actions">
          <WalletPanel />
          <button className="mobile-menu-toggle" onClick={toggleMenu} aria-label="Toggle menu" aria-expanded={isMobileMenuOpen}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div className={`mobile-menu-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-inner">
          <ul className="mobile-nav-links" role="list">
            {navItems.map(({ id, label }) => (
              <li key={id}>
                {isHome ? (
                  <a
                    href={`#${id}`}
                    className={`mobile-nav-link${activeSection === id ? ' active' : ''}`}
                    onClick={(e) => { e.preventDefault(); handleNavClick(id, true); }}
                  >
                    {label}
                  </a>
                ) : (
                  <Link to={`/#${id}`} className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                    {label}
                  </Link>
                )}
              </li>
            ))}
            <li>
              <Link to="/employer" className={`mobile-nav-link${location.pathname === '/employer' ? ' active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
                Employer Dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

// "?"? Footer "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
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
              Ac 2026 AegisPay A Privacy-preserving payroll on Stellar
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
