import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

// Helper to generate a secure random string
const generateSecureSeed = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return new TextDecoder().decode(encode(array));
};

// Helper to hash the seed
const hashSeed = async (seed: string) => {
  const data = new TextEncoder().encode(seed);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new TextDecoder().decode(encode(new Uint8Array(hashBuffer)));
};

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Authenticate the user calling the function
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error("Unauthorized");

    const { newClientSeed } = await req.json();

    // 1. Find the currently active seed pair
    const { data: activePair, error: fetchError } = await supabase
      .from("seed_pairs")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw fetchError;
    }

    // 2. If an active pair exists, reveal its secret seed and deactivate it
    if (activePair) {
      await supabase
        .from("seed_pairs")
        .update({ 
          is_active: false, 
          server_seed_raw: activePair.server_seed_secret // Reveal the secret!
        })
        .eq("id", activePair.id);
    }

    // 3. Generate the new Seed Pair
    const newServerSeedSecret = generateSecureSeed();
    const newServerSeedHash = await hashSeed(newServerSeedSecret);

    const { data: newPair, error: insertError } = await supabase
      .from("seed_pairs")
      .insert({
        user_id: user.id,
        server_seed_hash: newServerSeedHash,
        server_seed_secret: newServerSeedSecret, // Hidden from frontend by RLS
        server_seed_raw: null,                   // Will be revealed next rotation
        client_seed: newClientSeed || generateSecureSeed(),
        nonce: 0,
        is_active: true
      })
      .select('id, server_seed_hash, client_seed, nonce') // Only return safe data
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ 
      success: true, 
      oldSeedRevealed: activePair ? activePair.server_seed_secret : null,
      newSeedPair: newPair
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
