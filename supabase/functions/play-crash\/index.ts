import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    const { betAmount, targetMultiplier } = await req.json();

    if (!betAmount || betAmount <= 0) throw new Error('Invalid bet amount');
    if (!targetMultiplier || targetMultiplier < 1.01) throw new Error('Target multiplier must be at least 1.01x');

    // 1. Balance Check
    const { data: profile } = await supabase.from('profiles').select('balance_usd').eq('id', user.id).single();
    const currentBalance = profile?.balance_usd || 0;
    if (currentBalance < betAmount) throw new Error('Insufficient balance');

    // 2. Fetch or Create Provably Fair Seed
    let { data: seedPair } = await supabase
      .from('seed_pairs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!seedPair) {
      const serverSeedRaw = crypto.randomUUID();
      const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serverSeedRaw));
      const serverSeedHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      const clientSeed = "client_" + Math.random().toString(36).substring(2, 10);

      const { data: newSeed } = await supabase
        .from('seed_pairs')
        .insert({ user_id: user.id, server_seed_raw: serverSeedRaw, server_seed_hash: serverSeedHash, client_seed: clientSeed, nonce: 0, is_active: true })
        .select('*').single();
      seedPair = newSeed;
    }

    const newNonce = seedPair.nonce + 1;
    await supabase.from('seed_pairs').update({ nonce: newNonce }).eq('id', seedPair.id);

    // 3. The Official Crash Math Algorithm
    const seedString = `${seedPair.server_seed_raw}:${seedPair.client_seed}:${newNonce}`;
    const hashBufferCrash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seedString));
    const hashArray = Array.from(new Uint8Array(hashBufferCrash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Take the first 52 bits (13 hex characters) of the hash
    const h = parseInt(hashHex.substring(0, 13), 16);
    const e = Math.pow(2, 52);

    let crashPoint = 1.00;
    
    // 1% House Edge: If divisible by 100, it crashes instantly at 1.00x!
    if (h % 100 !== 0) {
      // Calculate the exponential curve
      crashPoint = Math.floor((100 * e - h) / (e - h)) / 100.0;
    }
    
    // Safety cap just in case of astronomical odds
    crashPoint = Math.min(Math.max(1.00, crashPoint), 1000000);

    // 4. Determine Win / Loss
    const won = crashPoint >= targetMultiplier;
    const finalPayout = won ? betAmount * targetMultiplier : 0;
    const status = won ? 'cashed_out' : 'busted';

    // 5. Update Balance
    const newBalance = currentBalance - betAmount + finalPayout;
    await supabase.from('profiles').update({ balance_usd: newBalance }).eq('id', user.id);

    // 6. Record Game in Database
    const { data: game, error: insertError } = await supabase
      .from('crash_games')
      .insert({
        user_id: user.id,
        seed_pair_id: seedPair.id,
        bet_amount: betAmount,
        crash_point: crashPoint,
        cashed_out_at: won ? targetMultiplier : null,
        final_payout: finalPayout,
        status: status
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    // Return the result to the frontend so it can animate the curve!
    return new Response(JSON.stringify({ 
      success: true, 
      gameId: game.id, 
      crashPoint, 
      won, 
      finalPayout, 
      newBalance 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: unknown) {
    let errorMessage = "Unknown error";
    if (err instanceof Error) errorMessage = err.message;
    else if (typeof err === 'object' && err !== null && 'message' in err) {
      errorMessage = String((err as Record<string, unknown>).message);
    }
    return new Response(JSON.stringify({ error: errorMessage }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
