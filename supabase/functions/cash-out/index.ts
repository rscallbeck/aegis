import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { gameId } = await req.json();

    // 1. Fetch the active game
    const { data: game, error: gameError } = await supabase
      .from("mines_games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameError || !game || game.status !== 'active') {
      throw new Error("No active game found to cash out.");
    }

    if (game.revealed_tiles.length === 0) {
      throw new Error("You must find at least one gem before cashing out.");
    }

    // 2. Calculate Final Payout
    const finalPayout = Number(game.bet_amount) * Number(game.payout_multiplier);

    // 3. Atomic Update: End Game and Update User Balance
    // In a production environment, use a Postgres Function (RPC) to ensure atomicity
    const { error: txError } = await supabase.rpc('handle_cash_out', {
      p_game_id: gameId,
      p_user_id: game.user_id,
      p_payout: finalPayout
    });

    if (txError) throw txError;

    return new Response(JSON.stringify({ 
      success: true, 
      finalPayout,
      minePositions: game.mine_positions // Reveal mines on cash out for transparency
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
