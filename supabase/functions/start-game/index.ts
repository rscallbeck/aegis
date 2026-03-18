import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // We use the Service Role Key here so the backend has admin privileges to safely update balances
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Authenticate the user from the frontend JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    const { betAmount, mineCount } = await req.json();

    if (betAmount <= 0 || mineCount < 1 || mineCount > 24) {
      throw new Error('Invalid bet amount or mine count');
    }

    // 2. Check and Deduct Balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance_usd')
      .eq('id', user.id)
      .single();

    if (!profile || profile.balance_usd < betAmount) {
      throw new Error('Insufficient balance');
    }

    const newBalance = profile.balance_usd - betAmount;
    await supabase.from('profiles').update({ balance_usd: newBalance }).eq('id', user.id);

    // 3. Provably Fair Math: Get Active Seed Pair & Increment Nonce
    const { data: seedPair } = await supabase
      .from('seed_pairs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!seedPair) {
      throw new Error('No active seed pair found. Please initialize your game seeds.');
    }

    const newNonce = seedPair.nonce + 1;
    await supabase.from('seed_pairs').update({ nonce: newNonce }).eq('id', seedPair.id);

    // 4. Generate Mine Positions (Fisher-Yates Shuffle driven by the SHA-256 hash)
    const seedString = `${seedPair.server_seed_secret}:${seedPair.client_seed}:${newNonce}`;
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seedString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    const deck = Array.from({ length: 25 }, (_, i) => i);
    let cursor = 0;
    
    for (let i = 24; i > 0; i--) {
      // Grab 2 bytes from the hash to generate a random 16-bit integer
      const randomInt = (hashArray[cursor] << 8) | hashArray[cursor + 1];
      cursor = (cursor + 2) % (hashArray.length - 1);
      
      const j = randomInt % (i + 1);
      // Swap
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    // Slice the shuffled deck to get the exact number of mines requested
    const minePositions = deck.slice(0, mineCount);

    // 5. Create the Game Record
    const { data: game, error: insertError } = await supabase
      .from('mines_games')
      .insert({
        user_id: user.id,
        seed_id: seedPair.id,
        bet_amount: betAmount,
        mines_count: mineCount,
        mine_positions: minePositions, 
        status: 'active'
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, gameId: game.id, newBalance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
