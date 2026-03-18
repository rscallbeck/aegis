'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useWeb3Login } from '@/app/hooks/useWeb3Login';
import MinesBoard from '@/app/components/MinesBoard';
import { supabase } from '@/app/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

export default function Home() {
  const { isConnected } = useAccount();
  const { login, isLoggingIn } = useWeb3Login();
  const [session, setSession] = useState<Session | null>(null);

  // Listen to Supabase Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-slate-950 text-white relative overflow-hidden">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full p-6 flex justify-between items-center z-10 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold tracking-widest text-emerald-400">
          PROJECT<span className="text-white">AEGIS</span>
        </h1>
        <ConnectButton />
      </div>

      <main className="z-10 flex flex-col items-center max-w-3xl text-center mt-16 w-full">
        
        {/* Only show the Hero text if they aren't fully logged in yet */}
        {(!isConnected || !session) && (
          <div className="space-y-8 mb-12">
            <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              Provably Fair. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                Instantly Settled.
              </span>
            </h2>
            
            <div className="w-full max-w-md mx-auto p-8 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-2xl flex flex-col items-center space-y-6">
              {!isConnected ? (
                <div className="flex flex-col items-center space-y-4">
                  <p className="text-slate-300">Connect your Web3 wallet to start.</p>
                  <ConnectButton />
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4 w-full">
                  <button 
                    onClick={login}
                    disabled={isLoggingIn}
                    className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoggingIn ? "Signing In..." : "Sign In to Play"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show the game board ONLY when the wallet is connected AND the session exists */}
        {isConnected && session && (
          <div className="w-full flex justify-center mt-8 z-10 animate-in fade-in zoom-in duration-500">
            <MinesBoard />
          </div>
        )}

      </main>
    </div>
  );
}
