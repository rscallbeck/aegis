'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useWeb3Login } from '@/app/hooks/useWeb3Login';
import { supabase } from '@/app/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import Link from 'next/link';

export default function Home() {
  const { isConnected } = useAccount();
  const { login, isLoggingIn } = useWeb3Login();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="flex flex-col items-center p-4 md:p-8 text-white relative w-full">
      {/* Main Content Area */}
      <main className="z-10 flex flex-col items-center max-w-5xl text-center mt-8 md:mt-16 w-full">
        {(!isConnected || !session) ? (
        // ... rest of the file stays exactly the same
          <div className="w-full max-w-md mx-auto p-8 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-2xl flex flex-col items-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {!isConnected ? (
              <div className="flex flex-col items-center space-y-4">
                <p className="text-slate-300 font-medium">Connect wallet</p>
                <ConnectButton />
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4 w-full">
                <button 
                  onClick={login}
                  disabled={isLoggingIn}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-lg tracking-widest rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoggingIn ? "AUTHENTICATING..." : "ENTER LOBBY"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full animate-in fade-in zoom-in duration-500">
            <h2 className="text-2xl md:text-3xl font-black tracking-widest text-slate-200 mb-8 text-left uppercase">
              Select Game
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Mines Game Card */}
              <Link href="/mines" className="group block text-left bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl overflow-hidden shadow-xl transition-all hover:-translate-y-2">
                <div className="h-48 bg-slate-800 flex items-center justify-center relative overflow-hidden">
                  <span className="text-6xl group-hover:scale-110 transition-transform duration-500">💣</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-black text-emerald-400 mb-2">MINES</h3>
                  <p className="text-sm text-slate-400">Navigate the grid. Uncover gems to increase your multiplier, but avoid the hidden mines.</p>
                </div>
              </Link>

              {/* Crash Game Card */}
              <Link href="/crash" className="group block text-left bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl overflow-hidden shadow-xl transition-all hover:-translate-y-2">
                <div className="h-48 bg-slate-800 flex items-center justify-center relative overflow-hidden">
                  <span className="text-6xl group-hover:scale-110 transition-transform duration-500">🚀</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-black text-emerald-400 mb-2">CRASH</h3>
                  <p className="text-sm text-slate-400">Cash out before the multiplier crashes to secure your winnings.</p>
                </div>
              </Link>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}
