'use client';

import dynamic from 'next/dynamic';

// Define the props of the component you're importing (optional but recommended)
interface Web3ProviderProps {
  children: React.ReactNode;
}

// 1. Dynamically import the provider and explicitly disable SSR for it
const Web3ProviderNoSSR = dynamic(
  () => import('./Web3Provider'),
  { ssr: false, 
    loading: () => <p>Loading...</p> // Optional: Add a loading state
  }
);

export default function Web3ProviderWrapper(props: Web3ProviderProps) {
  return <Web3ProviderNoSSR {...props} />;
}
