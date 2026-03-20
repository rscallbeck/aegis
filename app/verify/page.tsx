'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function VerifyPage() {
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState<number>(1);
  const [mineCount, setMineCount] = useState<number>(3);
  const [minePositions, setMinePositions] = useState<number[] | null>(null);
  const [error, setError] = useState('');

  const verifyGame = async () => {
    try {
      setError('');
      setMinePositions(null);

      if (!serverSeed || !clientSeed) {
        setError('Both Server Seed and Client Seed are required.');
        return;
      }

      // 1. Recreate the exact seed string used by the backend
      const seedString = `${serverSeed}:${clientSeed}:${nonce}`;
      
      // 2. Generate the SHA-256 Hash
      const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seedString));
      const hashArray = Array.from(new Uint8Array(hashBuffer));

      // 3. Recreate the Fisher-Yates Shuffle
      const deck = Array.from({ length: 25 }, (_, i) => i);
      let cursor = 0;
      
      for (let i = 24; i > 0; i--) {
        const randomInt = (hashArray[cursor] << 8) | hashArray[cursor + 1];
        cursor = (cursor + 2) % (hashArray.length - 1);
        const j = randomInt % (i + 1);
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      
      // 4. Slice the array to find the exact mine locations
      setMinePositions(deck.slice(0, mineCount));

    } catch (err) {
      console.error(err);
      setError('Failed to calculate hash. Check your inputs.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 bg-slate-950 text-white selection:bg-emerald-500/30">
      
      <div className="w-full max-w-3xl mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-black tracking-widest text-emerald-400">
          PROVABLY<span className="text-white">FAIR</span>
        </h1>
        <Link href="/" className="text-slate-400 hover:text-emerald-400 font-bold tracking-wider transition-colors text-sm">
          ← BACK TO GAME
        </Link>
      </div>

      <div className="w-full max-w-3xl bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-8">
        
        <div>
          <h2 className="text-xl font-bold mb-2">Verify a Game</h2>
          <p className="text-slate-400 text-sm">
            Paste your raw server seed and client seed below. This tool will recreate the cryptographic hash 
            locally in your browser to prove exactly where the mines were placed before you placed your bet.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm font-bold">
            {error}
          </div>
        )}

        {/* Inputs */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-slate-400 text-sm font-semibold tracking-wider uppercase">Raw Server Seed</label>
            <input 
              type="text" 
              value={serverSeed}
              onChange={(e) => setServerSeed(e.target.value)}
              placeholder="Paste the revealed server_seed_raw here..."
              className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-emerald-500 outline-none transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-400 text-sm font-semibold tracking-wider uppercase">Client Seed</label>
            <input 
              type="text" 
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              placeholder="e.g., client_a1b2c3d4"
              className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-emerald-500 outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-slate-400 text-sm font-semibold tracking-wider uppercase">Nonce (Game #)</label>
              <input 
                type="number" 
                value={nonce}
                onChange={(e) => setNonce(Number(e.target.value))}
                min="1"
                className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-emerald-500 outline-none transition-colors"
              />
              <p className="text-xs text-slate-500">Usually 1 if you rotated seeds right after playing.</p>
            </div>

            <div className="space-y-2">
              <label className="text-slate-400 text-sm font-semibold tracking-wider uppercase">Mines Count</label>
              <input 
                type="number" 
                value={mineCount}
                onChange={(e) => setMineCount(Number(e.target.value))}
                min="1"
                max="24"
                className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-emerald-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <button 
          onClick={verifyGame}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl tracking-widest rounded-xl shadow-lg transition-all active:scale-95 uppercase"
        >
          Verify Board
        </button>

        {/* The Resulting Board */}
        {minePositions && (
          <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col items-center space-y-6">
            <h3 className="text-emerald-400 font-bold tracking-widest uppercase text-lg">
              Verified Mine Locations
            </h3>
            
            <div className="grid grid-cols-5 gap-2 p-4 bg-slate-950 rounded-xl border border-slate-800">
              {Array.from({ length: 25 }).map((_, i) => {
                const isMine = minePositions.includes(i);
                return (
                  <div 
                    key={i} 
                    className={`w-12 h-12 flex items-center justify-center rounded-md font-bold text-lg
                      ${isMine 
                        ? 'bg-red-500/20 border border-red-500 text-red-500' 
                        : 'bg-slate-800 text-slate-600'
                      }`}
                  >
                    {isMine ? '💣' : '💎'}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
