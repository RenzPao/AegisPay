import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertTriangle, Info, X, HelpCircle } from 'lucide-react';
import type { ParsedError } from '../lib/errors';

interface ErrorModalProps {
  error: ParsedError | null;
  onClose: () => void;
}

const iconMap = {
  error:   <XCircle size={32} color="var(--color-destructive)" />,
  warning: <AlertTriangle size={32} color="var(--color-warning)" />,
  info:    <Info size={32} color="var(--color-info)" />,
};

const borderColor = {
  error:   'rgba(239,68,68,0.3)',
  warning: 'rgba(234,179,8,0.3)',
  info:    'rgba(59,130,246,0.3)',
};

const glowColor = {
  error:   'rgba(239,68,68,0.08)',
  warning: 'rgba(234,179,8,0.08)',
  info:    'rgba(59,130,246,0.08)',
};

export function ErrorModal({ error, onClose }: ErrorModalProps) {
  if (!error) return null;

  return (
    <AnimatePresence>
      {error && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
            }}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="err-modal-title"
            aria-describedby="err-modal-desc"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              width: 'min(520px, 92vw)',
              background: 'var(--color-bg-card)',
              border: `1px solid ${borderColor[error.severity]}`,
              borderRadius: 'var(--radius-xl)',
              boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px ${borderColor[error.severity]}, inset 0 0 40px ${glowColor[error.severity]}`,
              overflow: 'hidden',
            }}
          >
            {/* Header stripe */}
            <div style={{
              height: 4,
              background: error.severity === 'error'
                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                : error.severity === 'warning'
                  ? 'linear-gradient(90deg, #eab308, #ca8a04)'
                  : 'linear-gradient(90deg, #3b82f6, #2563eb)',
            }} />

            <div style={{ padding: '28px 32px 32px' }}>
              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="Close error dialog"
                style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-muted)', padding: 4, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-foreground)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
              >
                <X size={20} />
              </button>

              {/* Icon + Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: glowColor[error.severity],
                  border: `1px solid ${borderColor[error.severity]}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {iconMap[error.severity]}
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 4 }}>
                    {error.severity === 'error' ? 'Error' : error.severity === 'warning' ? 'Warning' : 'Notice'}
                  </div>
                  <h2 id="err-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-foreground)', margin: 0 }}>
                    {error.title}
                  </h2>
                </div>
              </div>

              {/* Message */}
              <p id="err-modal-desc" style={{
                color: 'var(--color-muted)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                marginBottom: error.hint ? 20 : 28,
              }}>
                {error.message}
              </p>

              {/* Hint box */}
              {error.hint && (
                <div style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  background: 'var(--color-bg-raised)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  marginBottom: 28,
                }}>
                  <HelpCircle size={18} color="var(--color-info)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-foreground)', lineHeight: 1.55 }}>
                    <strong style={{ color: 'var(--color-info)' }}>How to fix: </strong>
                    {error.hint}
                  </p>
                </div>
              )}

              {/* Actions */}
              <button
                onClick={onClose}
                className="btn btn-glass"
                style={{ width: '100%' }}
              >
                Got it
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook: manages a single modal-error state.
 */
import { useState } from 'react';
import { parseError } from '../lib/errors';

export function useErrorModal() {
  const [modalError, setModalError] = useState<ParsedError | null>(null);

  const showError = (rawMsg: string | undefined | null) => {
    setModalError(parseError(rawMsg));
  };

  const clearError = () => setModalError(null);

  return { modalError, showError, clearError };
}
