import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle, Shield, Zap, Globe, Lock } from 'lucide-react';
import '../styles/pitchdeck.css';

const SLIDE_COUNT = 10;

// Animation variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.9,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.9,
  }),
};

export default function PitchDeck() {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);

  // Apply special body class for pitchdeck styling
  useEffect(() => {
    document.body.classList.add('pitchdeck-mode');
    return () => document.body.classList.remove('pitchdeck-mode');
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide();
      else if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page]);

  const paginate = (newDirection: number) => {
    const newPage = page + newDirection;
    if (newPage >= 0 && newPage < SLIDE_COUNT) {
      setDirection(newDirection);
      setPage(newPage);
    }
  };

  const nextSlide = () => paginate(1);
  const prevSlide = () => paginate(-1);
  const goToSlide = (index: number) => {
    setDirection(index > page ? 1 : -1);
    setPage(index);
  };

  const renderSlide = () => {
    switch (page) {
      case 0:
        return (
          <div className="pd-glass-card" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div style={{ marginBottom: 40 }}>
              <Shield size={80} color="var(--pd-primary)" style={{ filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.5))' }} />
            </div>
            <h1>AegisPay</h1>
            <h2>Zero-Knowledge Payroll on Stellar</h2>
            <p style={{ fontSize: '1.5rem', maxWidth: 600, margin: '0 auto' }}>
              Private, fast, and borderless salary distribution for the modern Web3 workforce.
            </p>
          </div>
        );
      
      case 1:
        return (
          <div className="pd-split-layout">
            <div>
              <h1 style={{ fontSize: '2.8rem' }}>The Problem</h1>
              <h2>Privacy vs. Transparency</h2>
              <p>
                In the Web3 era, DAOs and crypto-native organizations face a critical dilemma when paying contributors:
              </p>
              <ul>
                <li><strong>Public Blockchains Expose Data:</strong> Paying employees via standard transactions reveals their salaries, wallet balances, and identity to the entire world.</li>
                <li><strong>TradFi is Slow & Costly:</strong> Using traditional banks for cross-border payroll involves high FX fees and takes days to settle.</li>
                <li><strong>Lack of Trust:</strong> Employees shouldn't have to trust centralized black-box databases with their financial privacy.</li>
              </ul>
            </div>
            <div className="pd-glass-card" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div style={{ textAlign: 'center' }}>
                <Lock size={64} color="#ef4444" style={{ margin: '0 auto 20px' }} />
                <h3 style={{ fontSize: '1.8rem', color: '#ef4444' }}>The Paradox</h3>
                <p style={{ color: 'var(--pd-text-main)' }}>How do you prove a payroll batch is fully funded and legitimate without revealing who is getting paid and how much?</p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="pd-split-layout">
            <div className="pd-glass-card" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
              <div style={{ textAlign: 'center' }}>
                <Shield size={64} color="#22c55e" style={{ margin: '0 auto 20px' }} />
                <h3 style={{ fontSize: '1.8rem', color: '#22c55e' }}>The Paradigm Shift</h3>
                <p style={{ color: 'var(--pd-text-main)' }}>Zero-Knowledge proofs allow mathematical verification of truth without revealing the underlying data.</p>
              </div>
            </div>
            <div>
              <h1 style={{ fontSize: '2.8rem' }}>The Solution</h1>
              <h2>AegisPay Architecture</h2>
              <p>
                AegisPay combines the speed and low cost of the <strong>Stellar Network</strong> with the absolute privacy of <strong>zk-SNARKs</strong>.
              </p>
              <ul>
                <li><strong>Cryptographic Commits:</strong> Payrolls are bundled into a Merkle Tree. Only the root is published on-chain.</li>
                <li><strong>Private Claiming:</strong> Employees generate a cryptographic proof on their device to withdraw funds from the smart contract.</li>
                <li><strong>Total Anonymity:</strong> The smart contract verifies the proof, but never learns the employee's ID, salary, or wallet address.</li>
              </ul>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="pd-glass-card">
            <h1 style={{ textAlign: 'center', fontSize: '2.8rem' }}>How it Works: The Employer</h1>
            <div className="pd-stats-grid" style={{ marginTop: 40 }}>
              <div className="pd-stat-box">
                <div style={{ background: 'var(--pd-glass-bg)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><span style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--pd-primary)'}}>1</span></div>
                <h3 style={{ marginBottom: 15 }}>Upload CSV</h3>
                <p style={{ fontSize: '1rem' }}>Employer uploads a simple CSV with Worker IDs and USD Salaries. System live-converts to XLM.</p>
              </div>
              <div className="pd-stat-box">
                <div style={{ background: 'var(--pd-glass-bg)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><span style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--pd-primary)'}}>2</span></div>
                <h3 style={{ marginBottom: 15 }}>Build Merkle Tree</h3>
                <p style={{ fontSize: '1rem' }}>Locally generates a Merkle Tree cryptographically binding salaries to worker IDs.</p>
              </div>
              <div className="pd-stat-box">
                <div style={{ background: 'var(--pd-glass-bg)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><span style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--pd-primary)'}}>3</span></div>
                <h3 style={{ marginBottom: 15 }}>Publish On-Chain</h3>
                <p style={{ fontSize: '1rem' }}>Publishes ONLY the Merkle Root to the Soroban contract and funds the escrow pool.</p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="pd-glass-card">
            <h1 style={{ textAlign: 'center', fontSize: '2.8rem' }}>How it Works: The Employee</h1>
            <div className="pd-stats-grid" style={{ marginTop: 40 }}>
              <div className="pd-stat-box">
                <div style={{ background: 'var(--pd-glass-bg)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><span style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--pd-primary)'}}>1</span></div>
                <h3 style={{ marginBottom: 15 }}>Receive Claim File</h3>
                <p style={{ fontSize: '1rem' }}>Employee receives an encrypted JSON claim file containing their specific Merkle path and salt.</p>
              </div>
              <div className="pd-stat-box">
                <div style={{ background: 'var(--pd-glass-bg)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><span style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--pd-primary)'}}>2</span></div>
                <h3 style={{ marginBottom: 15 }}>Generate ZK Proof</h3>
                <p style={{ fontSize: '1rem' }}>Browser uses SnarkJS to generate a Groth16 Zero-Knowledge proof locally without exposing secrets.</p>
              </div>
              <div className="pd-stat-box">
                <div style={{ background: 'var(--pd-glass-bg)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><span style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--pd-primary)'}}>3</span></div>
                <h3 style={{ marginBottom: 15 }}>Withdraw Instantly</h3>
                <p style={{ fontSize: '1rem' }}>Proof is submitted to the Smart Contract. Contract verifies it in milliseconds and releases the XLM.</p>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="pd-glass-card" style={{ alignItems: 'center', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2.8rem', marginBottom: 40 }}>The Technology Stack</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', maxWidth: 800 }}>
              {['Stellar Network', 'Soroban Smart Contracts', 'Rust', 'Circom', 'SnarkJS', 'Groth16', 'React', 'Framer Motion'].map(tech => (
                <div key={tech} style={{ 
                  background: 'var(--pd-bg)', 
                  padding: '15px 30px', 
                  borderRadius: 30, 
                  fontWeight: 600,
                  color: 'var(--pd-primary)',
                  boxShadow: '6px 6px 12px var(--pd-shadow-dark), -6px -6px 12px var(--pd-shadow-light)'
                }}>
                  {tech}
                </div>
              ))}
            </div>
            <p style={{ marginTop: 40, maxWidth: 700 }}>
              Built natively on Stellar's new Soroban smart contract platform, leveraging highly optimized Rust contracts and standard Circom circuits for maximum security and minimal gas fees.
            </p>
          </div>
        );

      case 6:
        return (
          <div className="pd-split-layout">
            <div>
              <h1 style={{ fontSize: '2.8rem' }}>Key Benefits</h1>
              <h2>Why AegisPay?</h2>
              <ul>
                <li><strong>100% On-Chain Verification:</strong> No trusted central servers. Everything is verified mathematically by the Stellar consensus protocol.</li>
                <li><strong>Zero Data Leaks:</strong> By design, it is impossible for the network to know an employee's salary or identity.</li>
                <li><strong>Double-Spend Prevention:</strong> Cryptographic "Nullifiers" ensure an employee can only claim their salary exactly once per batch.</li>
                <li><strong>Instant Settlement:</strong> Leveraging Stellar's 5-second ledger closing times.</li>
              </ul>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="pd-glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                <CheckCircle size={40} color="var(--pd-accent)" />
                <h3 style={{ margin: 0 }}>Fully Trustless</h3>
              </div>
              <div className="pd-glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                <Zap size={40} color="var(--pd-accent)" />
                <h3 style={{ margin: 0 }}>Lightning Fast</h3>
              </div>
              <div className="pd-glass-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                <Globe size={40} color="var(--pd-accent)" />
                <h3 style={{ margin: 0 }}>Borderless</h3>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="pd-glass-card">
            <h1 style={{ textAlign: 'center', fontSize: '2.8rem' }}>Traction & Validation</h1>
            <p style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 40px' }}>
              AegisPay is not just a concept. It is a fully functional product deployed on the Stellar Testnet.
            </p>
            <div className="pd-stats-grid">
              <div className="pd-stat-box">
                <div className="pd-stat-num">Live</div>
                <div className="pd-stat-label">Soroban Testnet</div>
              </div>
              <div className="pd-stat-box">
                <div className="pd-stat-num">64+</div>
                <div className="pd-stat-label">Verified Users</div>
              </div>
              <div className="pd-stat-box">
                <div className="pd-stat-num">100%</div>
                <div className="pd-stat-label">ZK Verification Success</div>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="pd-split-layout">
            <div className="pd-glass-card" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
              <div style={{ textAlign: 'center' }}>
                <Globe size={64} color="#3b82f6" style={{ margin: '0 auto 20px' }} />
                <h3 style={{ fontSize: '1.8rem', color: '#3b82f6' }}>TAM</h3>
                <p style={{ color: 'var(--pd-text-main)' }}>The global payroll market is worth billions, with Web3/DAOs being the fastest-growing niche demanding privacy.</p>
              </div>
            </div>
            <div>
              <h1 style={{ fontSize: '2.8rem' }}>Target Market</h1>
              <h2>Who needs AegisPay?</h2>
              <ul>
                <li><strong>Decentralized Autonomous Organizations (DAOs):</strong> Managing treasury payouts without doxxing core contributors.</li>
                <li><strong>Web3 Startups:</strong> Paying global contractors in crypto while maintaining traditional corporate privacy standards.</li>
                <li><strong>Freelance Platforms:</strong> Escrowing funds and enabling private payouts for gig workers.</li>
              </ul>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="pd-glass-card" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div style={{ marginBottom: 30 }}>
              <Shield size={60} color="var(--pd-primary)" />
            </div>
            <h1 style={{ fontSize: '3rem' }}>Join the Future of Payroll</h1>
            <p style={{ fontSize: '1.5rem', maxWidth: 600, margin: '0 auto 40px' }}>
              Privacy is a fundamental right, not a luxury.
            </p>
            
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="/" className="pd-nav-btn" style={{ position: 'static', transform: 'none', width: 'auto', padding: '0 30px', borderRadius: 30, textDecoration: 'none', fontWeight: 'bold' }}>
                Try Live Demo
              </a>
              <a href="https://github.com/RenzPao/AegisPay" target="_blank" rel="noopener noreferrer" className="pd-nav-btn" style={{ position: 'static', transform: 'none', width: 'auto', padding: '0 30px', borderRadius: 30, textDecoration: 'none', fontWeight: 'bold', background: 'var(--pd-primary)', color: 'white' }}>
                View GitHub
              </a>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="pd-container">
      {/* Navigation Arrows */}
      <button className="pd-nav-btn pd-nav-prev" onClick={prevSlide} disabled={page === 0}>
        <ChevronLeft size={30} />
      </button>
      
      <button className="pd-nav-btn pd-nav-next" onClick={nextSlide} disabled={page === SLIDE_COUNT - 1}>
        <ChevronRight size={30} />
      </button>

      {/* Main Slide Area */}
      <div className="pd-slide">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            style={{
              position: 'absolute',
              top: 50,
              left: 50,
              right: 50,
              bottom: 50,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {renderSlide()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination Indicators */}
      <div className="pd-indicators">
        {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`pd-dot ${i === page ? 'active' : ''}`}
            onClick={() => goToSlide(i)}
          />
        ))}
      </div>
    </div>
  );
}
