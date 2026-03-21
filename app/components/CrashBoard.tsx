'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '@/app/lib/supabaseClient';

type ChatMessage = {
  id: string;
  username: string;
  message: string;
  time: string;
};

export default function CrashBoard() {
  const [gameState, setGameState] = useState<'starting' | 'in-progress' | 'crashed'>('starting');
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [timeRemaining, setTimeRemaining] = useState<number>(10);
  const [history, setHistory] = useState<number[]>([]); 
  
  const [betAmount, setBetAmount] = useState<number>(10);
  const [targetMultiplier, setTargetMultiplier] = useState<number>(2.00);
  const [betStatus, setBetStatus] = useState<'idle' | 'placed' | 'won'>('idle');
  const [, setRoundId] = useState<number>(0);
  
  // 🚨 NEW: Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const socketRef = useRef<Socket | null>(null);

  // 🎵 Sound Effects Engine
  const playSound = (type: 'click' | 'win' | 'crash') => {
    const sounds = {
      click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      win: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
      crash: 'https://assets.mixkit.co/active_storage/sfx/1696/1696-preview.mp3'
    };
    const audio = new Audio(sounds[type]);
    audio.volume = 0.5;
    audio.play().catch(err => console.warn("Audio autoplay blocked by browser:", err));
  };

  /*
  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;
  */

  useEffect(() => {
    // 🚨 CHANGED: Now using HTTPS to connect to the secure local server
    const socket = io('https://localhost:3001'); 
    socketRef.current = socket;

    socket.on('connect', () => console.log('✅ Connected to live Crash Engine!'));

    socket.on('game-tick', (state: { status: 'starting' | 'in-progress' | 'crashed'; multiplier: number; timeRemaining: number; history?: number[]; roundId: number }) => {
      setGameState(state.status);
      setMultiplier(state.multiplier);
      setTimeRemaining(state.timeRemaining);
      
      if (state.history) setHistory(state.history);
      
      setRoundId((prevRoundId) => {
        if (prevRoundId !== 0 && prevRoundId !== state.roundId) {
          setBetStatus('idle'); 
        }
        return state.roundId;
      });
    });

    // 🚨 NEW: Chat Listeners
    socket.on('chat-history', (msgs: ChatMessage[]) => {
      setChatMessages(msgs);
    });

    socket.on('new-message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on('bet-accepted', () => {
      setBetStatus('placed');
      window.dispatchEvent(new Event('balance-updated')); 
    });

    socket.on('bet-error', (errorMsg: string) => {
      alert(errorMsg);
    });

    socket.on('bet-won', () => {
      setBetStatus('won');
      playSound('win'); // 🚨 NEW: Play cashout sound!
      window.dispatchEvent(new Event('balance-updated')); 
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 🚨 NEW: Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handlePlaceBet = async () => {
    playSound('click'); // 🚨 NEW: Play click sound instantly
    
    const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please connect your wallet and sign in first.");
        return;
      }

    if (socketRef.current) {
      socketRef.current.emit('place-bet', {
        token: session.access_token,
        betAmount,
        targetMultiplier
      });
    }
  };

  // 🚨 NEW: Watch for crashes to play the explosion!
  useEffect(() => {
    if (gameState === 'crashed') {
      playSound('crash');
    }
  }, [gameState]);

  // 🚨 NEW: Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Please connect your wallet and sign in to chat.");
      return;
    }

    if (socketRef.current) {
      socketRef.current.emit('send-message', {
        token: session.access_token,
        message: chatInput
      });
      setChatInput(''); // clear input
    }
  };

  return (
    // WIDENED to max-w-7xl to fit 3 columns!
    <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full max-w-7xl mx-auto p-4 md:p-6 bg-slate-900/50 border border-slate-800 rounded-2xl shadow-2xl">
      
      {/* 1. LEFT PANEL: Betting Controls */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 bg-slate-950 p-6 rounded-xl border border-slate-800">
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
          <label className="text-slate-400 text-sm font-semibold">Target Multiplier</label>
          <div className="flex bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
            <input 
              type="number" 
              step="0.1"
              min="1.01"
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

          {gameState !== 'starting' && betStatus === 'won' && (
            <button 
              disabled
              className="w-full py-4 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-black text-xl tracking-widest rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all cursor-not-allowed uppercase"
            >
              🎉 CASHED OUT
            </button>
          )}

          {gameState !== 'starting' && betStatus !== 'won' && (
            <button 
              disabled
              className="w-full py-4 bg-slate-800 text-slate-500 font-black text-lg tracking-widest rounded-xl shadow-lg transition-all cursor-not-allowed uppercase"
            >
              FLIGHT IN PROGRESS
            </button>
          )}
        </div>
      </div>

      {/* 2. MIDDLE PANEL: Live Crash Graph */}
      <div className="flex-1 flex flex-col w-full min-w-[300px]">
        <div className="w-full flex justify-end gap-2 mb-4 h-8 overflow-hidden">
          {history.length === 0 && (
             <span className="text-xs text-slate-600 font-bold uppercase flex items-center tracking-widest">Awaiting Flights...</span>
          )}
          {history.map((val, idx) => (
            <span key={idx} className={`flex items-center justify-center px-3 py-1 rounded-full text-xs font-black tracking-wider animate-in slide-in-from-right-4 duration-300 ${
              val >= 2.0 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
            }`}>
              {val.toFixed(2)}x
            </span>
          ))}
        </div>

        <div className={`relative w-full aspect-square md:aspect-auto md:h-[500px] rounded-xl border-2 shadow-2xl overflow-hidden flex flex-col items-center justify-center transition-colors duration-300 ${
          betStatus === 'won' ? 'border-emerald-500 bg-emerald-950/30' : 'border-slate-800 bg-slate-950'
        }`}>
          {gameState === 'starting' && (
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <h2 className="text-slate-500 font-bold tracking-widest text-xl mb-2">PREPARING FLIGHT</h2>
              <h1 className="text-8xl font-black text-slate-300 drop-shadow-md">{timeRemaining}s</h1>
            </div>
          )}
          {gameState === 'in-progress' && (
            <div className="text-center">
              <h1 className={`text-8xl md:text-9xl font-black drop-shadow-[0_0_30px_rgba(16,185,129,0.4)] tracking-tighter ${
                betStatus === 'won' ? 'text-emerald-300' : 'text-emerald-500'
              }`}>
                {multiplier.toFixed(2)}x
              </h1>
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

      {/* 3. RIGHT PANEL: Social Chat */}
      <div className="w-full lg:w-72 flex-shrink-0 h-[550px] lg:h-auto flex flex-col bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/50 border-b border-slate-800">
          <h3 className="text-emerald-400 font-black tracking-widest text-sm uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Lobby Chat
          </h3>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/50">
          {chatMessages.length === 0 ? (
            <p className="text-xs text-slate-600 text-center mt-4">No messages yet. Say hi!</p>
          ) : (
            chatMessages.map((msg) => (
              <div key={msg.id} className="text-sm break-words animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="font-bold text-slate-400">{msg.username}: </span>
                <span className="text-slate-300">{msg.message}</span>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-3 bg-slate-900 border-t border-slate-800">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={150}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button 
              type="submit"
              disabled={!chatInput.trim()}
              className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/50 rounded-lg px-4 py-2 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SEND
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
