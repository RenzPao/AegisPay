/**
 * AegisPay — WalletContext
 * Provides wallet state globally so Navbar, ClaimForm, etc. all share one connection
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useWallet } from '../hooks/useWallet';

type WalletContextValue = ReturnType<typeof useWallet>;

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used inside <WalletProvider>');
  return ctx;
}
