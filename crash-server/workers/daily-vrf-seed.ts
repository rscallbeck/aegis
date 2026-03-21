import { ethers } from 'ethers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
//import dotenv from '.env';

//dotenv.config();

// 1. Strict Environment Variable Checks
// This ensures TypeScript knows these values are strings, not 'undefined'
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RPC_URL = process.env.RPC_URL;
const HOUSE_WALLET_PRIVATE_KEY = process.env.HOUSE_WALLET_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RPC_URL || !HOUSE_WALLET_PRIVATE_KEY || !CONTRACT_ADDRESS) {
  console.error("❌ Missing required environment variables. Check your .env file.");
  process.exit(1);
}

// 2. Setup Supabase
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 3. Setup Ethers & Blockchain Connection
const provider = new ethers.JsonRpcProvider(RPC_URL); 
const wallet = new ethers.Wallet(HOUSE_WALLET_PRIVATE_KEY, provider);

// Only include the parts of the ABI we actually need
const contractABI: string[] = [
  "function requestNewSeed() external returns (uint256)",
  "event SeedGenerated(uint256 indexed requestId, uint256 randomSeed)"
];

const vrfContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

async function fetchDailySeed(): Promise<void> {
  console.log("🎲 Waking up to fetch daily Chainlink VRF seed...");

  try {
    // Request the seed from the smart contract
    console.log("📡 Sending request to Base Sepolia...");
    const tx = await vrfContract.requestNewSeed();
    console.log(`⏳ Transaction sent! Hash: ${tx.hash}`);
    
    // Wait for the transaction to be mined
    await tx.wait();
    console.log("✅ Transaction confirmed. Waiting for Chainlink Oracle response...");

    // Listen for the oracle to call back with the random number
    // Ethers v6 returns uint256 as a BigInt
    vrfContract.once("SeedGenerated", async (requestId: bigint, randomSeed: bigint) => {
      console.log(`🔥 SUCCESS! Chainlink delivered seed for Request ID: ${requestId.toString()}`);
      
      // Generate the Secret Casino Salt (to prevent players from predicting outcomes)
      const casinoSalt: string = crypto.randomBytes(32).toString('hex');
      
      // Save to Supabase
      const { error } = await supabase
        .from('daily_seeds')
        .insert({
          vrf_request_id: requestId.toString(),
          chainlink_seed: randomSeed.toString(),
          casino_salt: casinoSalt
        });

      if (error) {
        console.error("❌ Failed to save to Supabase:", error);
        process.exit(1);
      } else {
        console.log("💾 Daily Seed and Secret Salt locked into Supabase. You are ready for the day!");
        process.exit(0); // Exit the worker cleanly
      }
    });

    // Fallback timeout just in case the oracle is congested
    setTimeout(() => {
      console.error("⏰ Timeout: Chainlink oracle took too long to respond. Try again later.");
      process.exit(1);
    }, 120000); // 2 minutes

  } catch (err) {
    // Strictly type the error block
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("❌ Worker failed:", errorMessage);
    process.exit(1);
  }
}

fetchDailySeed();
