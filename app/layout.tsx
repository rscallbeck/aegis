import type { Metadata } from 'next';
import './globals.css';
import Web3Provider from '@/components/providers/Web3Provider';

export const metadata: Metadata = {
  title: 'Project Aegis | Provably Fair Casino',
  description: 'Next-gen decentralized gaming on Base and Polygon.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased">
        <Web3Provider>
          {/* Your Nav Bar with <ConnectButton /> goes here */}
          <main className="min-h-screen">
            {children}
          </main>
        </Web3Provider>
      </body>
    </html>
  );
}
