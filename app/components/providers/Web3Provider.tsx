'use client';

import React, { useState } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { 
  getDefaultConfig, 
  RainbowKitProvider, 
  darkTheme 
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { base, polygon } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

const wagmiConfig = getDefaultConfig({
  appName: 'Project Aegis',
  projectId: projectId,
  chains: [base, polygon],
  ssr: true, 
});

interface Web3ProviderProps {
  children: React.ReactNode;
}

export default function Web3Provider({ children }: Web3ProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#10b981',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
