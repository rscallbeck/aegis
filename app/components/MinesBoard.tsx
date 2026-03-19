'use client';

import React, { useState, useEffect, useRef } from 'react';
import { initMinesGame } from '@/app/lib/game/minesConfig';
// Add this line to import your Supabase client!
import { supabase } from '@/app/lib/supabaseClient'; 

export default function MinesBoard() {

  const gameContainerRef = useRef<HTMLDivElement | null>(null);
  const phaserInstanceRef = useRef<Phaser.Game | null>(null);
  const activeGameIdRef = useRef<string | null>(null);

  // Game State
  const [betAmount, setBetAmount] = useState<number>(10);
  const [mineCount, setMineCount] = useState<number>(3);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'cashed_out' | 'busted'>('idle');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.00);

  // Initialize the Phaser Canvas
  useEffect(() => {
    if (typeof window !== 'undefined' && gameContainerRef.current && !phaserInstanceRef.current) {
      
      const handleTileClick = async (tileId: number): Promise<boolean> => {
        if (!activeGameId) return false;

        try {
          // Call the Reveal Edge Function
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reveal-tile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: activeGameId, tileId }),
          });

          const result = await response.json();

          if (result.isMine) {
            setGameState('busted');
            return true; // Tells Phaser to show a Bomb
          } else {
            setCurrentMultiplier(result.payout_multiplier);
            return false; // Tells Phaser to show a Gem
          }
        } catch (error) {
          console.error("Error revealing tile:", error);
          return false;
        }
      };

      phaserInstanceRef.current = initMinesGame({
        containerId: 'mines-canvas-container',
        onTileClick: handleTileClick,
      });
    }

    return () => {
      if (phaserInstanceRef.current) {
        phaserInstanceRef.current.destroy(true);
        phaserInstanceRef.current = null;
      }
    };
  }, [activeGameId]);

  // Replace the old simulated startGame function with this:
  const startGame = async () => {
    try {
      
      // 1. Get the current user session so we can prove who is placing the bet
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session found. Please sign in.");
        return;
      }

      // 2. Call our new Edge Function
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/start-game`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // Pass the JWT!
        },
        body: JSON.stringify({ betAmount, mineCount }),
      });

      const result = await response.json();

      if (result.success) {
        // 3. Unlock the board!
        setGameState('playing');
        setCurrentMultiplier(1.00);
        setActiveGameId(result.gameId);
        // ADD THIS: Save the ID to the ref immediately!
        activeGameIdRef.current = result.gameId;  
        console.log(`Real game started! Postgres ID: ${result.gameId}`);
        console.log(`New Wallet Balance: $${result.newBalance}`);
      } else {
        console.error("Backend error:", result.error);
        // You might want to show a toast/alert here to the user
      }
    } catch (error) {
      console.error("Network error starting game:", error);
    }
  };
  
  // Handle Cash Out
  const cashOut = async () => {
    if (!activeGameId) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cash-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGameId }),
      });

      const result = await response.json();
      if (result.success) {
        setGameState('cashed_out');
        console.log(`Cashed out for ${result.finalPayout}!`);
        // Note: You can call a method on your Phaser scene here to trigger the win animation
      }
    } catch (error) {
      console.error("Error cashing out:", error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start w-full max-w-5xl mx-auto p-6 bg-slate-900/50 border border-slate-800 rounded-2xl shadow-2xl">
      
      {/* LEFT PANEL: Betting Controls */}
      <div className="w-full md:w-80 flex flex-col gap-6 bg-slate-950 p-6 rounded-xl border border-slate-800">
        
        {/* Bet Amount Input */}
        <div className="space-y-2">
          <label className="text-slate-400 text-sm font-semibold">Bet Amount (USD)</label>
          <div className="flex bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
            <span className="p-3 text-emerald-500 font-bold">$</span>
            <input 
              type="number" 
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              disabled={gameState === 'playing'}
              className="w-full bg-transparent text-white font-bold outline-none"
            />
          </div>
        </div>

        {/* Mines Count Selector */}
        <div className="space-y-2">
          <label className="text-slate-400 text-sm font-semibold">Mines</label>
          <select 
            value={mineCount}
            onChange={(e) => setMineCount(Number(e.target.value))}
            disabled={gameState === 'playing'}
            className="w-full p-3 bg-slate-900 text-white font-bold rounded-lg border border-slate-700 outline-none"
          >
            {[...Array(24)].map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </div>

        {/* Action Button */}
        {gameState === 'playing' ? (
          <button 
            onClick={cashOut}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xl rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            CASH OUT <br/>
            <span className="text-sm font-bold">(${(betAmount * currentMultiplier).toFixed(2)})</span>
          </button>
        ) : (
          <button 
            onClick={startGame}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl rounded-xl transition-all active:scale-95"
          >
            BET
          </button>
        )}
      </div>

      {/* RIGHT PANEL: Phaser Game Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center">
        
        {/* Multiplier Display */}
        <div className="h-16 flex items-center justify-center mb-4">
          {gameState === 'playing' && (
            <h3 className="text-5xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              {currentMultiplier.toFixed(2)}x
            </h3>
          )}
          {gameState === 'busted' && (
            <h3 className="text-5xl font-black text-red-500 tracking-tighter">BUSTED</h3>
          )}
          {gameState === 'cashed_out' && (
            <h3 className="text-5xl font-black text-emerald-400 tracking-tighter">WINNER!</h3>
          )}
        </div>

{/* Wrapper to safely isolate React and Phaser DOMs */}
        <div className="relative w-[500px] h-[500px] rounded-xl border-2 border-slate-800 shadow-2xl overflow-hidden">
          
          {/* 1. The Phaser Container - React should NOT put children inside this! */}
          <div id="mines-canvas-container" ref={gameContainerRef} className="w-full h-full bg-slate-950" />

          {/* 2. The React Overlay - Now safely floating above the canvas as a sibling */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 z-10 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-slate-400 tracking-widest">PLACE BET TO START</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
