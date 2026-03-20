'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';

export default function Header() {
  const pathname = usePathname();
  const isLobby = pathname === '/';
  
  // State
  const [balance, setBalance] = useState<number | null>(null);
  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(100);
  const [isDepositing, setIsDepositing] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('balance_usd')
          .eq('id', session.user.id)
          .single();
          
        if (data && !error) setBalance(Number(data.balance_usd));
      } else {
        setBalance(null);
      }
    };

    fetchBalance();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => fetchBalance());
    window.addEventListener('balance-updated', fetchBalance);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('balance-updated', fetchBalance);
    };
  }, []);

  const handleDeposit = async () => {
    setIsDepositing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/deposit-funds`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ amount: depositAmount }),
      });

      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error);

      // Instantly refresh the balance across the app
      window.dispatchEvent(new Event('balance-updated'));
      setIsCashierOpen(false); // Close the modal
      
    } catch (error) {
      console.error("Deposit failed:", error);
      alert(`Deposit failed: ${error}`);
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <>
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
        
        {/* Controls */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm flex items-center justify-center gap-3 z-50 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl md:bg-transparent md:border-none md:p-0 md:shadow-none md:absolute md:bottom-auto md:left-auto md:right-8 md:top-6 md:translate-x-0 md:w-auto">
          
          {/* UPDATED: Clickable Balance Badge */}
          {balance !== null && (
            <button 
              onClick={() => setIsCashierOpen(true)}
              className="flex items-center justify-center bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500 transition-colors rounded-xl px-4 h-10 shadow-inner group"
              title="Open Cashier"
            >
              <span className="text-emerald-400 font-bold tracking-wider text-sm group-hover:text-emerald-300 transition-colors">
                ${balance.toFixed(2)}
              </span>
              <span className="ml-2 text-slate-600 group-hover:text-emerald-400 font-black transition-colors">+</span>
            </button>
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
          
          <ConnectButton />
        </div>
      </header>

      {/* NEW: Cashier Modal Overlay */}
      {isCashierOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-emerald-400 tracking-wider">CASHIER</h3>
              <button 
                onClick={() => setIsCashierOpen(false)} 
                className="text-slate-500 hover:text-white font-bold text-2xl transition-colors"
              >
                &times;
              </button>
            </div>
            
            <p className="text-sm text-slate-400">Mint free testnet funds to your profile to continue playing.</p>

            <div className="grid grid-cols-3 gap-2">
              {[100, 500, 1000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setDepositAmount(amt)}
                  className={`py-3 rounded-xl font-bold border transition-all ${
                    depositAmount === amt 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            <button 
              onClick={handleDeposit}
              disabled={isDepositing}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black tracking-widest uppercase rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isDepositing ? "Minting..." : `Mint $${depositAmount}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
