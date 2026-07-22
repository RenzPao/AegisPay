import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Navbar, Footer } from '../components/Layout';

export default function NotFound() {
  return (
    <>
      <Navbar activeSection="none" onNav={() => {}} />
      <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div 
          className="neu-card glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: 'var(--space-10)', textAlign: 'center', maxWidth: 400 }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
            <AlertCircle size={64} color="var(--color-accent)" />
          </div>
          <h1 style={{ marginBottom: 'var(--space-4)' }}>404 Not Found</h1>
          <p style={{ marginBottom: 'var(--space-6)', color: 'var(--color-muted)' }}>
            The page you are looking for does not exist or has been moved.
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-block' }}>
            Return Home
          </Link>
        </motion.div>
      </main>
      <Footer />
    </>
  );
}
