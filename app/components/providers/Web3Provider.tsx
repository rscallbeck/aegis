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

// You will need to get a free Project ID from cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

const wagmiConfig = getDefaultConfig({
  appName: 'Project Aegis',
  projectId: projectId,
  chains: [base, polygon],
  ssr: true, // Crucial for Next.js 16 App Router hydration
});

interface Web3ProviderProps {
  children: React.ReactNode;
}

export default function Web3Provider({ children }: Web3ProviderProps) {
  // Instantiate QueryClient inside the component to ensure 
  // data is not shared across different users during SSR.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#10b981', // Emerald 500 - Matrix/Casino vibe
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
