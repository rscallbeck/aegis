'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';

export default function Header() {
  const pathname = usePathname();
  const isLobby = pathname === '/';
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('balance_usd')
          .eq('id', session.user.id)
          .single();
          
        if (data && !error) {
          setBalance(Number(data.balance_usd));
        }
      } else {
        setBalance(null);
      }
    };

    // Fetch on initial load
    fetchBalance();

    // Re-fetch if the user logs in/out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchBalance();
    });

    // Listen for our custom "ping" from the game board!
    window.addEventListener('balance-updated', fetchBalance);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('balance-updated', fetchBalance);
    };
  }, []);

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
        
        {/* ADDED: Balance Display */}
        {balance !== null && (
          <div className="flex items-center justify-center bg-slate-950 border border-slate-800 rounded-xl px-4 h-10 shadow-inner">
            <span className="text-emerald-400 font-bold tracking-wider text-sm">
              ${balance.toFixed(2)}
            </span>
          </div>
        )}

        {/* Return Button */}
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
        
        <ConnectButton
          label="Connect Wallet"
          chainStatus="icon"
          accountStatus={{
            smallScreen: 'avatar',
            largeScreen: 'full',
          }}
            showBalance={{
            smallScreen: false,
            largeScreen: true,
          }}
        />

      </div>
    </header>
  );
}
