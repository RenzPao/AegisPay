import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Globe, Zap, Eye, ArrowRight } from 'lucide-react';

// ── Animation variants ────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

const staggerChildren = { visible: { transition: { staggerChildren: 0.1 } } };

// ── Hero Section ─────────────────────────────────────────────
export function HeroSection({ onClaim }: { onClaim: () => void }) {
  const stats = [
    { value: '< $0.01', label: 'Network Fee' },
    { value: '~6s',     label: 'Settlement Time' },
    { value: '0',       label: 'Identity Exposed' },
    { value: '190+',    label: 'Countries Supported' },
  ];

  return (
    <section id="hero" className="hero" aria-labelledby="hero-heading">
      {/* Background */}
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
        <div className="hero-grid-overlay" />
      </div>

      <div className="container">
        <motion.div
          className="hero-content"
          initial="hidden"
          animate="visible"
          variants={staggerChildren}
        >
          {/* Eyebrow badge */}
          <motion.div variants={fadeUp} custom={0} className="hero-eyebrow">
            <span className="badge badge-accent">
              <span className="pulse-dot" aria-hidden="true" />
              Built on Stellar Protocol 25
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1 id="hero-heading" className="hero-title" variants={fadeUp} custom={1}>
            Payroll That{' '}
            <span className="gradient-text">Protects</span>
            <br />
            Your Privacy
          </motion.h1>

          {/* Subtitle */}
          <motion.p className="hero-subtitle" variants={fadeUp} custom={2}>
            AegisPay uses zero-knowledge cryptography on Stellar to let workers claim
            wages without ever exposing their identity, income, or employer on-chain.
            Fully compliant. Fully private.
          </motion.p>

          {/* CTAs */}
          <motion.div className="hero-actions" variants={fadeUp} custom={3}>
            <button
              className="btn btn-primary"
              onClick={onClaim}
              aria-label="Start claiming your wages"
              style={{ fontSize: '1.05rem', padding: '14px 32px' }}
            >
              <Zap size={18} aria-hidden="true" />
              Claim Your Wages
            </button>
            <a
              href="#how-it-works"
              className="btn btn-glass"
              onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}
              aria-label="Learn how AegisPay works"
            >
              How it works
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div className="hero-stats" variants={fadeUp} custom={4} aria-label="Key statistics">
            {stats.map((s, i) => (
              <div key={i} className="hero-stat">
                <div className="hero-stat-value gradient-text">{s.value}</div>
                <div className="hero-stat-label">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Features Section ─────────────────────────────────────────
const features = [
  {
    icon: <Lock size={24} color="var(--color-accent)" aria-hidden="true" />,
    title: 'Zero-Knowledge Proof',
    desc: 'Your identity and wage amount remain cryptographically private. Only you can generate a valid proof of entitlement.',
  },
  {
    icon: <Shield size={24} color="var(--color-info)" aria-hidden="true" />,
    title: 'AML Compliant',
    desc: 'Funds are routed through SEP-31 licensed anchors who satisfy KYC/AML requirements at the off-ramp — not on-chain.',
  },
  {
    icon: <Globe size={24} color="var(--color-warning)" aria-hidden="true" />,
    title: 'Global Fiat Off-Ramp',
    desc: 'Atomic SDEX path payments convert XLM to 190+ local fiat assets via licensed anchors. No exchange registration needed.',
  },
  {
    icon: <Zap size={24} color="#c084fc" aria-hidden="true" />,
    title: 'Gas-Free for Workers',
    desc: 'A relayer submits your claim via Stellar fee-bump transactions. You need zero XLM to get started.',
  },
  {
    icon: <Eye size={24} color="#f97316" aria-hidden="true" />,
    title: 'Nullifier Protection',
    desc: 'Smart-contract nullifiers prevent any wage from being claimed twice. Cryptographic, not administrative.',
  },
  {
    icon: <ArrowRight size={24} color="#e879f9" aria-hidden="true" />,
    title: '6-Second Settlement',
    desc: 'Stellar\'s 5-second ledger close plus atomic routing means funds reach your anchor in seconds, not days.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="section" aria-labelledby="features-heading">
      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="badge badge-info" style={{ marginBottom: 16 }}>Why AegisPay</span>
          <h2 id="features-heading">Privacy-First Finance<br />at Global Scale</h2>
          <p>Engineered for the 1.7 billion migrant workers and gig-economy contractors who deserve financial dignity.</p>
        </motion.div>

        <div className="grid-3" role="list" aria-label="AegisPay features">
          {features.map((f, i) => (
            <motion.article
              key={i}
              className="neu-card feature-card"
              role="listitem"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
            >
              <div className="feature-icon" aria-hidden="true">{f.icon}</div>
              <h3>{f.title}</h3>
              <p style={{ marginTop: 8, fontSize: '0.925rem' }}>{f.desc}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ─────────────────────────────────────────────
const steps = [
  { num: 1, title: 'Employer Deposits Escrow', desc: 'The employer locks XLM into the Soroban payroll contract and registers a Merkle root of worker entitlements.' },
  { num: 2, title: 'Worker Generates ZK Proof', desc: 'In this browser, you enter your private credentials. A Groth16 proof is generated locally — your data never leaves your device.' },
  { num: 3, title: 'Proof Submitted via Relayer', desc: 'A relayer packages the proof into a Stellar fee-bump transaction and submits it to the network on your behalf. Zero XLM required.' },
  { num: 4, title: 'Contract Verifies & Routes', desc: 'The Soroban contract verifies the ZK proof, marks your nullifier as spent, then executes an atomic SDEX path payment to your chosen asset.' },
  { num: 5, title: 'Anchor Delivers Fiat', desc: 'Your local SEP-31 anchor receives the funds and deposits fiat directly into your bank account or mobile wallet.' },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="section" style={{ background: 'linear-gradient(180deg, transparent, rgba(14,20,36,0.8), transparent)' }} aria-labelledby="how-heading">
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-16)', alignItems: 'start' }}>
          {/* Left: Steps */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="badge badge-accent" style={{ marginBottom: 16 }}>The Flow</span>
            <h2 id="how-heading" style={{ marginBottom: 12 }}>From Proof<br />to Payout</h2>
            <p style={{ marginBottom: 'var(--space-8)' }}>Five atomic steps. One private transaction. Fiat in your pocket.</p>
            <div className="flow-steps" role="list">
              {steps.map((s, i) => (
                <motion.div
                  key={s.num}
                  className="glass-card flow-step"
                  role="listitem"
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flow-step-num" aria-hidden="true">{s.num}</div>
                  <div>
                    <h4>{s.title}</h4>
                    <p>{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Visual proof terminal */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            style={{ position: 'sticky', top: 100 }}
          >
            <div className="proof-terminal" role="figure" aria-label="Example ZK proof output">
              <div className="proof-terminal-header" aria-hidden="true">
                <span className="terminal-dot red" />
                <span className="terminal-dot yellow" />
                <span className="terminal-dot green" />
                <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                  aegispay_proof.json
                </span>
              </div>
              <div className="proof-terminal-body">
                <div><span className="comment">// Groth16 BN254 ZK-SNARK Proof</span></div>
                <div><span className="label">protocol:</span> <span className="value">"groth16"</span>,</div>
                <div><span className="label">curve:</span>    <span className="value">"bn128"</span>,</div>
                <br />
                <div><span className="label">proof:</span> {'{'}</div>
                <div style={{ paddingLeft: 16 }}><span className="label">pi_a:</span> <span className="value">["0x1a3e...", "0xb24f...", "1"]</span>,</div>
                <div style={{ paddingLeft: 16 }}><span className="label">pi_b:</span> <span className="value">[[...], [...], ["1","0"]]</span>,</div>
                <div style={{ paddingLeft: 16 }}><span className="label">pi_c:</span> <span className="value">["0x7c11...", "0x4de8...", "1"]</span></div>
                <div>{'}'}</div>
                <br />
                <div><span className="label">publicSignals:</span> [</div>
                <div style={{ paddingLeft: 16 }}><span className="comment">// merkle root</span></div>
                <div style={{ paddingLeft: 16 }}><span className="value">"21888...1"</span>,</div>
                <div style={{ paddingLeft: 16 }}><span className="comment">// nullifier (spent after claim)</span></div>
                <div style={{ paddingLeft: 16 }}><span className="value">"14792...8"</span>,</div>
                <div style={{ paddingLeft: 16 }}><span className="comment">// claimed amount (in stroops)</span></div>
                <div style={{ paddingLeft: 16 }}><span className="value">"50000000"</span></div>
                <div>]</div>
                <br />
                <div><span className="comment">// ✅ Identity: HIDDEN &nbsp; Wage: PROVEN</span></div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid-2" style={{ marginTop: 'var(--space-5)' }}>
              {[
                { v: '~2s',     l: 'Proof generation time' },
                { v: '256-bit', l: 'Nullifier entropy' },
                { v: 'Groth16', l: 'Proving scheme' },
                { v: 'BN254',   l: 'Elliptic curve' },
              ].map((s, i) => (
                <div key={i} className="stat-chip">
                  <span className="stat-chip-value">{s.v}</span>
                  <span className="stat-chip-label">{s.l}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
