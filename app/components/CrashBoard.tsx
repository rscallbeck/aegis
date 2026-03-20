'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '@/app/lib/supabaseClient';

export default function CrashBoard() {
  // Syncs with the Node.js Server State
  const [gameState, setGameState] = useState<'starting' | 'in-progress' | 'crashed'>('starting');
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [timeRemaining, setTimeRemaining] = useState<number>(10);
  
  // Local Betting State
  const [betAmount, setBetAmount] = useState<number>(10);
  const [targetMultiplier, setTargetMultiplier] = useState<number>(2.00);
  const [betStatus, setBetStatus] = useState<'idle' | 'placed' | 'won'>('idle');
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => console.log('✅ Connected to live Crash Engine!'));

    // Heartbeat
    socket.on('game-tick', (state: { status: 'starting' | 'in-progress' | 'crashed'; multiplier: number; timeRemaining: number; }) => {
      setGameState(state.status);
      setMultiplier(state.multiplier);
      setTimeRemaining(state.timeRemaining);
      
      // Reset local bet status when a new round starts
      if (state.status === 'starting' && state.timeRemaining === 10) {
        setBetStatus('idle');
      }
    });

    // Betting Events
    socket.on('bet-accepted', () => {
      setBetStatus('placed');
      window.dispatchEvent(new Event('balance-updated')); // Ping header to drop balance
    });

    socket.on('bet-error', (errorMsg: string) => {
      alert(`Bet failed: ${errorMsg}`);
    });

  socket.on('bet-won', () => {
      setBetStatus('won');
      window.dispatchEvent(new Event('balance-updated')); // Ping header to add winnings!
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const handlePlaceBet = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Please connect your wallet and sign in first.");
      return;
    }

    if (socketRef.current) {
      // Send the bet to the Node server with the secure JWT token
      socketRef.current.emit('place-bet', {
        token: session.access_token,
        betAmount,
        targetMultiplier
      });
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start w-full max-w-5xl mx-auto p-6 bg-slate-900/50 border border-slate-800 rounded-2xl shadow-2xl">
      
      {/* LEFT PANEL: Betting Controls */}
      <div className="w-full md:w-80 flex flex-col gap-6 bg-slate-950 p-6 rounded-xl border border-slate-800">
        
        <div className="space-y-2">
          <label className="text-slate-400 text-sm font-semibold">Bet Amount (USD)</label>
          <div className="flex bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
            <span className="p-3 text-emerald-500 font-bold">$</span>
            <input 
              type="number" 
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              disabled={gameState !== 'starting' || betStatus === 'placed'}
              className="w-full bg-transparent text-white font-bold outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-slate-400 text-sm font-semibold">Target Multiplier (Auto Cashout)</label>
          <div className="flex bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
            <input 
              type="number" 
              value={targetMultiplier}
              onChange={(e) => setTargetMultiplier(Number(e.target.value))}
              disabled={gameState !== 'starting' || betStatus === 'placed'}
              className="w-full p-3 bg-transparent text-white font-bold outline-none"
            />
            <span className="p-3 text-slate-500 font-bold">x</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center w-full">
          {gameState === 'starting' && betStatus === 'idle' && (
            <button 
              onClick={handlePlaceBet}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xl tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              PLACE BET
            </button>
          )}

          {gameState === 'starting' && betStatus === 'placed' && (
            <button 
              disabled
              className="w-full py-4 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-black text-xl tracking-widest rounded-xl transition-all cursor-not-allowed uppercase"
            >
              BET LOCKED
            </button>
          )}

          {gameState !== 'starting' && (
            <button 
              disabled
              className="w-full py-4 bg-slate-800 text-slate-500 font-black text-lg tracking-widest rounded-xl shadow-lg transition-all cursor-not-allowed uppercase"
            >
              WAITING FOR NEXT ROUND
            </button>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Live Crash Graph */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[500px]">
        <div className={`relative w-full aspect-square rounded-xl border-2 shadow-2xl overflow-hidden flex flex-col items-center justify-center transition-colors duration-300 ${
          betStatus === 'won' ? 'border-emerald-500 bg-emerald-950/30' : 'border-slate-800 bg-slate-950'
        }`}>
          
          {gameState === 'starting' && (
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <h2 className="text-slate-500 font-bold tracking-widest text-xl mb-2">PREPARING FLIGHT</h2>
              <h1 className="text-8xl font-black text-slate-300 drop-shadow-md">
                {timeRemaining}s
              </h1>
              {betStatus === 'placed' && (
                <p className="mt-4 text-emerald-400 font-bold tracking-widest animate-pulse uppercase">
                  Good Luck!
                </p>
              )}
            </div>
          )}

          {gameState === 'in-progress' && (
            <div className="text-center">
              <h1 className={`text-8xl md:text-9xl font-black drop-shadow-[0_0_30px_rgba(16,185,129,0.4)] tracking-tighter ${
                betStatus === 'won' ? 'text-emerald-300' : 'text-emerald-500'
              }`}>
                {multiplier.toFixed(2)}x
              </h1>
              {betStatus === 'won' && (
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-emerald-400 font-black text-2xl tracking-widest animate-bounce drop-shadow-lg uppercase whitespace-nowrap">
                  SUCCESS: {targetMultiplier.toFixed(2)}x
                </div>
              )}
            </div>
          )}

          {gameState === 'crashed' && (
            <div className="text-center animate-in zoom-in-110 duration-200">
              <h2 className="text-red-500 font-bold tracking-widest text-2xl mb-2">CRASHED AT</h2>
              <h1 className="text-8xl md:text-9xl font-black text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)] tracking-tighter">
                {multiplier.toFixed(2)}x
              </h1>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
