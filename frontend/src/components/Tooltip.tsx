import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children || <HelpCircle size={16} style={{ color: 'var(--color-muted)', cursor: 'help', marginLeft: '4px' }} />}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '8px',
              width: 'max-content',
              maxWidth: '250px',
              backgroundColor: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              border: 'var(--glass-border)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--neu-shadow-out), 0 10px 25px rgba(0,0,0,0.5)',
              color: 'var(--color-foreground)',
              fontSize: '0.85rem',
              lineHeight: 1.4,
              textAlign: 'center',
              zIndex: 100,
              pointerEvents: 'none'
            }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
