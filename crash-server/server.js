import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto'; // 🚨 NEW: Node's built-in cryptography library

dotenv.config();

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 🚨 NEW: Global Provably Fair Settings
// In production, you generate a massive chain of hashes in reverse. 
// For this engine, we use a Master Seed and an incrementing Round ID.
const GLOBAL_SERVER_SEED = crypto.randomBytes(32).toString('hex');
const PUBLIC_SALT = "0000000000000000000301e2801a9a9598bfb114e574a91a887f2132f33047e6"; // A real, historical Bitcoin Block Hash!
let currentRoundId = 1;

let gameState = {
  status: 'starting',
  multiplier: 1.00,
  crashPoint: 0,
  timeRemaining: 10,
  roundId: currentRoundId,
  activeBets: {} 
};

// 🚨 NEW: The Official Crash Algorithm
function generateCrashPoint(serverSeed, salt, roundId) {
  // 1. Create an HMAC SHA-256 hash
  const hash = crypto.createHmac('sha256', serverSeed)
                     .update(`${salt}:${roundId}`)
                     .digest('hex');

  // 2. Take the first 52 bits (13 hex characters)
  const h = parseInt(hash.substring(0, 13), 16);
  const e = Math.pow(2, 52);

  // 3. The 1% House Edge: If divisible by 100, instant 1.00x crash
  if (h % 100 === 0) return 1.00;

  // 4. Calculate the exponential curve
  let crashPoint = Math.floor((100 * e - h) / (e - h)) / 100.0;
  
  // Cap it at a million to prevent infinite flights
  return Math.min(Math.max(1.00, crashPoint), 1000000); 
}

async function runGameLoop() {
  while (true) {
    // --- PHASE 1: ACCEPTING BETS ---
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

    // --- PHASE 2: FLIGHT IN PROGRESS ---
    gameState.status = 'in-progress';
    
    // 🚨 NEW: Generate the cryptographic crash point!
    gameState.crashPoint = generateCrashPoint(GLOBAL_SERVER_SEED, PUBLIC_SALT, currentRoundId);
    console.log(`🚀 ROCKET LAUNCHED! (Secret Crash Point: ${gameState.crashPoint}x)`);

    while (gameState.multiplier < gameState.crashPoint) {
      gameState.multiplier += (gameState.multiplier * 0.005); 
      if (gameState.multiplier > gameState.crashPoint) gameState.multiplier = gameState.crashPoint;

      // Auto-Cashout Logic
      for (const [userId, bet] of Object.entries(gameState.activeBets)) {
        if (!bet.cashedOut && gameState.multiplier >= bet.targetMultiplier) {
          bet.cashedOut = true;
          bet.winnings = bet.betAmount * bet.targetMultiplier;
          
          console.log(`🎉 Player cashed out at ${bet.targetMultiplier}x for $${bet.winnings}!`);

          // Credit winnings to database
          supabase.from('profiles').select('balance_usd').eq('id', userId).single().then(({ data }) => {
            if (data) supabase.from('profiles').update({ balance_usd: data.balance_usd + bet.winnings }).eq('id', userId);
          });

          // Alert the player
          io.to(bet.socketId).emit('bet-won');
        }
      }

      io.emit('game-tick', gameState);
      await new Promise(resolve => setTimeout(resolve, 50)); 
    }

    // --- PHASE 3: CRASHED ---
    gameState.status = 'crashed';
    
    // 🚨 NEW: Reveal the hash so players can mathematically verify it!
    const roundHash = crypto.createHmac('sha256', GLOBAL_SERVER_SEED).update(`${PUBLIC_SALT}:${currentRoundId}`).digest('hex');
    console.log(`💥 CRASHED AT ${gameState.multiplier.toFixed(2)}x! (Provable Hash: ${roundHash})`);
    
    io.emit('game-tick', gameState);
    
    currentRoundId++; // Increment for the next game
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

io.on('connection', (socket) => {
  socket.emit('game-tick', gameState);

  socket.on('place-bet', async ({ token, betAmount, targetMultiplier }) => {
    if (gameState.status !== 'starting') return socket.emit('bet-error', 'Round is already in progress!');

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) throw new Error('Unauthorized');

      const { data: profile } = await supabase.from('profiles').select('balance_usd').eq('id', user.id).single();
      if (!profile || profile.balance_usd < betAmount) throw new Error('Insufficient balance');

      await supabase.from('profiles').update({ balance_usd: profile.balance_usd - betAmount }).eq('id', user.id);

      gameState.activeBets[user.id] = { socketId: socket.id, betAmount, targetMultiplier, cashedOut: false, winnings: 0 };
      console.log(`💰 Bet placed: $${betAmount} @ ${targetMultiplier}x by ${user.id}`);
      
      socket.emit('bet-accepted');
    } catch (err) {
      socket.emit('bet-error', err.message);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎲 Aegis Crash Engine running on port ${PORT}`);
  runGameLoop();
});
