import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle, XCircle, Info } from 'lucide-react';

// ── Toast System ─────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info';
export interface Toast { id: string; type: ToastType; title: string; message?: string; }

const toastIcons = {
  success: <CheckCircle size={18} color="var(--color-accent)" />,
  error:   <XCircle size={18} color="var(--color-destructive)" />,
  info:    <Info size={18} color="var(--color-info)" />,
};

export function ToastArea({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="toast-area" role="region" aria-label="Notifications" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast ${t.type}`}
            initial={{ opacity: 0, x: 60, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            role="alert"
          >
            {toastIcons[t.type]}
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-foreground)', marginBottom: t.message ? 2 : 0 }}>{t.title}</div>
              {t.message && <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{t.message}</div>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', lineHeight: 1 }}
            >✕</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = (type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, title, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  };
  const dismiss = (id: string) => setToasts(p => p.filter(t => t.id !== id));
  return { toasts, dismiss, success: (title: string, msg?: string) => add('success', title, msg), error: (title: string, msg?: string) => add('error', title, msg), info: (title: string, msg?: string) => add('info', title, msg) };
}
