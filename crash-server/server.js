import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const GLOBAL_SERVER_SEED = crypto.randomBytes(32).toString('hex');
const PUBLIC_SALT = "0000000000000000000301e2801a9a9598bfb114e574a91a887f2132f33047e6"; 
let currentRoundId = 1;

let gameState = {
  status: 'starting',
  multiplier: 1.00,
  crashPoint: 0,
  timeRemaining: 20,
  roundId: currentRoundId,
  activeBets: {},
  history: [] 
};

// 🚨 NEW: Global Chat Memory
let chatHistory = [];

function generateCrashPoint(serverSeed, salt, roundId) {
  const hash = crypto.createHmac('sha256', serverSeed).update(`${salt}:${roundId}`).digest('hex');
  const h = parseInt(hash.substring(0, 13), 16);
  const e = Math.pow(2, 52);

  // 98% RTP (1 in 50 instant crash)
  if (h % 50 === 0) return 1.00;

  let crashPoint = Math.floor((100 * e - h) / (e - h)) / 100.0;
  return Math.min(Math.max(1.00, crashPoint), 1000000); 
}

async function runGameLoop() {
  while (true) {
    gameState.status = 'starting';
    gameState.multiplier = 1.00;
    gameState.activeBets = {};
    gameState.timeRemaining = 10;
    gameState.roundId = currentRoundId;
    
    console.log(`\n🟢 NEW ROUND [${currentRoundId}]: Accepting Bets...`);
    
    while (gameState.timeRemaining > 0) {
      io.emit('game-tick', gameState);
      await new Promise(resolve => setTimeout(resolve, 1000));
      gameState.timeRemaining--;
    }

    gameState.status = 'in-progress';
    gameState.crashPoint = generateCrashPoint(GLOBAL_SERVER_SEED, PUBLIC_SALT, currentRoundId);
    console.log(`🚀 ROCKET LAUNCHED! (Secret Crash Point: ${gameState.crashPoint}x)`);

    while (gameState.multiplier < gameState.crashPoint) {
      gameState.multiplier += (gameState.multiplier * 0.005); 
      if (gameState.multiplier > gameState.crashPoint) gameState.multiplier = gameState.crashPoint;

      for (const [userId, bet] of Object.entries(gameState.activeBets)) {
        if (!bet.cashedOut && gameState.multiplier >= bet.targetMultiplier) {
          bet.cashedOut = true;
          bet.winnings = bet.betAmount * bet.targetMultiplier;
          
          supabase.from('profiles').select('balance_usd').eq('id', userId).single().then(({ data }) => {
            if (data) supabase.from('profiles').update({ balance_usd: data.balance_usd + bet.winnings }).eq('id', userId);
          });

          io.to(bet.socketId).emit('bet-won');
        }
      }

      io.emit('game-tick', gameState);
      await new Promise(resolve => setTimeout(resolve, 50)); 
    }

    gameState.status = 'crashed';
    gameState.history.push(parseFloat(gameState.multiplier.toFixed(2)));
    if (gameState.history.length > 10) gameState.history.shift();

    const roundHash = crypto.createHmac('sha256', GLOBAL_SERVER_SEED).update(`${PUBLIC_SALT}:${currentRoundId}`).digest('hex');
    console.log(`💥 CRASHED AT ${gameState.multiplier.toFixed(2)}x! (Provable Hash: ${roundHash})`);
    
    io.emit('game-tick', gameState);
    
    currentRoundId++;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

io.on('connection', (socket) => {
  socket.emit('game-tick', gameState);
  
  // 🚨 NEW: Instantly send the new player the chat history
  socket.emit('chat-history', chatHistory);

  socket.on('place-bet', async ({ token, betAmount, targetMultiplier }) => {
    if (gameState.status !== 'starting') return socket.emit('bet-error', 'Round is already in progress!');
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) throw new Error('Unauthorized');
      const { data: profile } = await supabase.from('profiles').select('balance_usd').eq('id', user.id).single();
      if (!profile || profile.balance_usd < betAmount) throw new Error('Insufficient balance');

      await supabase.from('profiles').update({ balance_usd: profile.balance_usd - betAmount }).eq('id', user.id);
      gameState.activeBets[user.id] = { socketId: socket.id, betAmount, targetMultiplier, cashedOut: false, winnings: 0 };
      
      socket.emit('bet-accepted');
    } catch (err) {
      socket.emit('bet-error', err.message);
    }
  });

  // 🚨 NEW: Listen for incoming chat messages
  socket.on('send-message', async ({ token, message }) => {
    try {
      if (!message || message.trim() === '') return;
      
      // Verify token so guests can't spam
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) throw new Error('Unauthorized');

      // Create a pseudo-anonymous username from their DB ID
      const username = "P" + user.id.substring(0, 4).toUpperCase();

      const chatMsg = {
        id: crypto.randomUUID(),
        username,
        message: message.substring(0, 150), // Cap length to 150 chars
        time: new Date().toISOString()
      };

      // Add to server memory and broadcast!
      chatHistory.push(chatMsg);
      if (chatHistory.length > 50) chatHistory.shift(); 
      io.emit('new-message', chatMsg);

    } catch {
      socket.emit('bet-error', 'Sign in to chat!');
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎲 Aegis Crash Engine running on port ${PORT}`);
  runGameLoop();
});
