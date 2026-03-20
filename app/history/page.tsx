'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';

type GameRecord = {
  id: string;
  game: 'MINES' | 'CRASH';
  betAmount: number;
  multiplier: number | null;
  payout: number;
  status: string;
  date: Date;
};

type MinesDbRow = {
  id: string;
  bet_amount: number;
  payout_multiplier: number | null;
  final_payout: number | null;
  status: string;
  created_at: string;
};

type CrashDbRow = {
  id: string;
  bet_amount: number;
  cashed_out_at: number | null;
  crash_point: number | null;
  final_payout: number | null;
  status: string;
  created_at: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<GameRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        // Fetch Mines History
        const { data: minesData } = await supabase
          .from('mines_games')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        // Fetch Crash History
        const { data: crashData } = await supabase
          .from('crash_games')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        // Normalize and Merge Data
        const mergedHistory: GameRecord[] = [];

        if (minesData) {
          minesData.forEach((game: MinesDbRow) => {
            mergedHistory.push({
              id: game.id,
              game: 'MINES',
              betAmount: Number(game.bet_amount),
              multiplier: game.payout_multiplier ? Number(game.payout_multiplier) : null,
              payout: Number(game.final_payout || 0),
              status: game.status,
              date: new Date(game.created_at),
            });
          });
        }

        if (crashData) {
          crashData.forEach((game: CrashDbRow) => {
            mergedHistory.push({
              id: game.id,
              game: 'CRASH',
              betAmount: Number(game.bet_amount),
              multiplier: game.cashed_out_at ? Number(game.cashed_out_at) : (game.crash_point ? Number(game.crash_point) : null),
              payout: Number(game.final_payout || 0),
              status: game.status,
              date: new Date(game.created_at),
            });
          });
        }

        // Sort by newest first
        mergedHistory.sort((a, b) => b.date.getTime() - a.date.getTime());
        setHistory(mergedHistory);

      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-400 animate-pulse">
        Loading Ledger...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 md:p-8 text-white relative w-full animate-in fade-in duration-500">
      <div className="w-full max-w-5xl mb-6 flex justify-start">
        <h2 className="text-2xl md:text-3xl font-black tracking-widest text-emerald-400 uppercase drop-shadow-md">
          MY BETS
        </h2>
      </div>

      <div className="w-full max-w-5xl bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-500 text-xs tracking-widest uppercase">
                <th className="p-4 font-bold">Game</th>
                <th className="p-4 font-bold">Date & Time</th>
                <th className="p-4 font-bold">Bet</th>
                <th className="p-4 font-bold">Multiplier</th>
                <th className="p-4 font-bold">Payout</th>
                <th className="p-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    No bets found. Time to hit the lobby!
                  </td>
                </tr>
              ) : (
                history.map((record) => {
                  const isWin = record.payout > 0;
                  return (
                    <tr key={record.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors text-sm">
                      <td className="p-4 font-black tracking-wider text-slate-300">
                        {record.game === 'MINES' ? '💣 MINES' : '🚀 CRASH'}
                      </td>
                      <td className="p-4 text-slate-500 font-medium">
                        {record.date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 font-bold text-slate-300">
                        ${record.betAmount.toFixed(2)}
                      </td>
                      <td className={`p-4 font-black ${isWin ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {record.multiplier ? `${record.multiplier.toFixed(2)}x` : '-'}
                      </td>
                      <td className={`p-4 font-bold ${isWin ? 'text-emerald-400' : 'text-slate-500'}`}>
                        ${record.payout.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-md text-xs font-black tracking-wider uppercase ${
                          isWin 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}>
                          {record.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
