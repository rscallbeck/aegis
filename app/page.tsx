'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useWeb3Login } from '@/app/hooks/useWeb3Login';
import MinesBoard from '@/app/components/MinesBoard';

export default function Home() {
  const { isConnected } = useAccount();
  const { login } = useWeb3Login();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-950 text-white relative overflow-hidden">
      
      {/* Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header / Nav */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-10 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold tracking-widest text-emerald-400">
          PROJECT<span className="text-white">AEGIS</span>
        </h1>
        <ConnectButton />
      </div>

      {/* Main Content */}
      <main className="z-10 flex flex-col items-center max-w-3xl text-center space-y-8 mt-16">
        
        <div className="space-y-4">
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Provably Fair. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
              Instantly Settled.
            </span>
          </h2>
          <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto">
            Experience the next generation of decentralized gaming. Connect your wallet to cryptographically verify every single bet.
          </p>
        </div>

        {/* Authentication & Game State */}
        <div className="w-full max-w-md p-8 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-2xl flex flex-col items-center space-y-6">
          
          {!isConnected ? (
            <div className="flex flex-col items-center space-y-4">
              <p className="text-slate-300">Connect your Web3 wallet to start.</p>
              <ConnectButton />
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 w-full">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg w-full">
                <p className="text-emerald-400 text-sm font-semibold mb-1">Wallet Connected</p>
                <p className="text-slate-300 text-xs">Signature required to access the game engine.</p>
              </div>
              
              <button 
                onClick={login}
                className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                Sign In to Play
              </button>
            </div>
          )}

        </div>

      </main>

      <div className="mt-12 z-10">
        <MinesBoard />
      </div>
      
    </div>
  );
}
