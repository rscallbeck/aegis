import type { Metadata } from 'next';
import './globals.css';
import Web3Provider from './components/providers/Web3Provider';
import ClientOnly from './components/providers/ClientOnly';
import Header from './components/Header';

export const metadata: Metadata = {
  title: 'Aegis | Provably Fair',
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
        <ClientOnly>
          <Web3Provider>
            {/* Main wrapper with global styling */}
            <div className="min-h-screen flex flex-col relative overflow-hidden">
              {/* Global Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
                <Header />
              {/* Added pb-28 for mobile to prevent content from hiding behind the bottom bar! */}
              <main className="flex-1 flex flex-col z-10 relative pb-28 md:pb-0">
                {children}
              </main>
              
            </div>
          </Web3Provider>
        </ClientOnly>
      </body>
    </html>
  );
}
