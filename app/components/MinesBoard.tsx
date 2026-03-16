'use client';

import React, { useEffect, useRef } from 'react';
import { initMinesGame } from '@/lib/game/minesConfig';

interface MinesBoardProps {
  onGameEvent?: (id: number) => void;
}

export default function MinesBoard({ onGameEvent }: MinesBoardProps) {
  // Explicitly type the ref for the HTML container
  const gameContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Explicitly type the Phaser Game instance
  const phaserInstanceRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Guard for SSR and ensure the container exists
    if (typeof window !== 'undefined' && gameContainerRef.current && !phaserInstanceRef.current) {
      
      const handleTileClick = async (id: number): Promise<boolean> => {
        console.log(`Strict TS: Tile ${id} clicked.`);
        // Here you would call your Supabase Edge Function
        // const { data, error } = await supabase.functions.invoke('reveal-tile', { body: { id } });
        
        onGameEvent?.(id);
        return false; // Mocking a 'gem' hit for now
      };

      phaserInstanceRef.current = initMinesGame({
        containerId: 'mines-canvas-container',
        onTileClick: handleTileClick,
      });
    }

    // Strict Cleanup: Prevent multiple canvas instances on Fast Refresh
    return () => {
      if (phaserInstanceRef.current) {
        phaserInstanceRef.current.destroy(true);
        phaserInstanceRef.current = null;
      }
    };
  }, [onGameEvent]);

  return (
    <div 
      id="mines-canvas-container" 
      ref={gameContainerRef} 
      className="w-[500px] h-[500px] mx-auto rounded-xl bg-slate-900/50 border border-white/10 shadow-2xl"
    />
  );
}
