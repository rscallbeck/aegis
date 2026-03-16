import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculateNextMultiplier } from "../../../lib/game/betting-logic.ts";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // Use Service Role to bypass RLS for checking mines
  );

  try {
    const { gameId, tileId } = await req.json();
    
    // 1. Fetch Game State
    const { data: game, error: fetchError } = await supabase
      .from("mines_games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (fetchError || !game || game.status !== 'active') {
      throw new Error("Game not found or already finished.");
    }

    // 2. Prevent Double-Clicking the same tile
    if (game.revealed_tiles.includes(tileId)) {
      throw new Error("Tile already revealed.");
    }

    const isMine = game.mine_positions.includes(tileId);
    let updateData: any = {};

    if (isMine) {
      // 💥 KABOOM
      updateData = {
        status: 'busted',
        revealed_tiles: [...game.revealed_tiles, tileId],
        final_payout: 0,
      };
    } else {
      // 💎 GEM FOUND
      const nextMultiplier = calculateNextMultiplier(game.revealed_tiles.length, {
        totalTiles: 25,
        mineCount: game.mine_count,
        houseEdge: 0.03, // 3% House Edge
      });

      updateData = {
        revealed_tiles: [...game.revealed_tiles, tileId],
        payout_multiplier: nextMultiplier,
      };
    }

    const { error: updateError } = await supabase
      .from("mines_games")
      .update(updateData)
      .eq("id", gameId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ 
      isMine, 
      payout_multiplier: updateData.payout_multiplier || 0 
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
