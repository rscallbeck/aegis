'use client';

import React, { useState, useEffect, useRef } from 'react';
import { initMinesGame } from '@/app/lib/game/minesConfig';
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
        if (!activeGameIdRef.current) {
          console.warn("Click ignored: No active game ID.");
          return false; 
        }

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reveal-tile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: activeGameIdRef.current, tileId }),
          });

          const result = await response.json();

          if (!response.ok || result.error) {
            console.error("Server refused to reveal tile:", result.error);
            alert(`Server Error: ${result.error}`); 
            throw new Error(result.error);
          }

          if (result.isMine) {
            setGameState('busted');
            activeGameIdRef.current = null;
            return true;
          } else {
            setCurrentMultiplier(result.payout_multiplier);
            return false;
          }
        } catch (error) {
          console.error("Tile reveal failed:", error);
          throw error; 
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

  const handleCashOut = async () => {
    if (!activeGameIdRef.current) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cash-out`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ gameId: activeGameIdRef.current }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error);
      }

      setGameState('idle'); 
      activeGameIdRef.current = null;
      
      alert(`🎉 CASHED OUT!\nYou won $${result.finalPayout.toFixed(2)}\nNew Balance: $${result.newBalance.toFixed(2)}`);
      
    } catch (error) {
      console.error("Cash out failed:", error);
      alert(`Error cashing out: ${error}`);
    }
  };

  const handleRotateSeed = async () => {
    if (gameState === 'playing') {
      alert("You can only rotate your seed when not in an active game!");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const customClientSeed = window.prompt("Enter a custom Client Seed (or leave blank to auto-generate):");

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/rotate-seed`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ customClientSeed: customClientSeed || undefined }),
      });

      const result = await response.json();

      if (!response.ok || result.error) throw new Error(result.error);

      alert(
        `✅ Seed Rotated Successfully!\n\n` +
        `YOUR PAST SERVER SEED (RAW):\n${result.oldServerSeedRaw || "None (First time playing)"}\n\n` +
        `NEW SERVER HASH:\n${result.newServerSeedHash}\n\n` +
        `NEW CLIENT SEED:\n${result.newClientSeed}\n\n` +
        `Save your past raw seed to verify your previous games were fair!`
      );
      
    } catch (error) {
      console.error("Seed rotation failed:", error);
      alert(`Error rotating seed: ${error}`);
    }
  };
  
  const startGame = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session found. Please sign in.");
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/start-game`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ betAmount, mineCount }),
      });

      const result = await response.json();

      if (result.success) {
        setGameState('playing');
        setCurrentMultiplier(1.00);
        setActiveGameId(result.gameId);
        activeGameIdRef.current = result.gameId;  
        console.log(`Real game started! Postgres ID: ${result.gameId}`);
        console.log(`New Wallet Balance: $${result.newBalance}`);
      } else {
        console.error("Backend error:", result.error);
      }
    } catch (error) {
      console.error("Network error starting game:", error);
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

        {/* Controls */}
        <div className="mt-6 flex flex-col items-center w-full">
          {gameState === 'playing' ? (
            <button 
              onClick={handleCashOut}
              className="w-full max-w-[500px] py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xl tracking-widest rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all active:scale-95"
            >
              CASH OUT ({currentMultiplier.toFixed(2)}x)
            </button>
          ) : (
            <button 
              onClick={startGame}
              className="w-full max-w-[500px] py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xl tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              {gameState === 'busted' ? 'PLAY AGAIN' : 'BET $10.00'}
            </button>
          )}

          {/* Provably Fair Button */}
          {gameState !== 'playing' && (
            <button 
              onClick={handleRotateSeed}
              className="mt-4 text-xs font-bold text-slate-500 hover:text-emerald-400 tracking-wider uppercase transition-colors"
            >
              Provably Fair Settings
            </button>
          )}
        </div>
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
