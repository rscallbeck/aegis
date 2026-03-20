'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const isLobby = pathname === '/';

  return (
    <header className="w-full flex justify-center relative z-10 max-w-7xl mx-auto pt-4 md:pt-6 px-4 md:px-8">
      {/* Central Logo */}
      <div className="flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-widest text-emerald-400 drop-shadow-md cursor-default">
          AEGIS
        </h1>
        <h2 className="mt-2 text-xs md:text-sm font-bold tracking-[0.2em] text-slate-400 uppercase text-center cursor-default">
          Provably Fair. <span className="text-emerald-500">Instantly Settled.</span>
        </h2>
      </div>
      
      {/* Controls: Floating Bottom Bar (Mobile) -> Top Right (Desktop) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm flex items-center justify-center gap-3 z-50 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl md:bg-transparent md:border-none md:p-0 md:shadow-none md:absolute md:bottom-auto md:left-auto md:right-8 md:top-6 md:translate-x-0 md:w-auto">
        
        {/* Only show the Return Button if we are NOT on the Lobby page */}
        {!isLobby && (
          <Link 
            href="/" 
            className="w-10 h-10 flex flex-shrink-0 items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-slate-300 hover:text-emerald-400 transition-all shadow-lg active:scale-95"
            title="Return to Lobby"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14 4 9l5-5"/>
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
            </svg>
          </Link>
        )}
        
        <ConnectButton />
      </div>
    </header>
  );
}
