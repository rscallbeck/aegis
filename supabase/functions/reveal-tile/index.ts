import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Ensure you actually created this file and folder!
import { calculateNextMultiplier } from '../_shared/betting-logic.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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

    // 2. Prevent Double-Clicking
    if (game.revealed_tiles.includes(tileId)) {
      throw new Error("Tile already revealed.");
    }

    const isMine = game.mine_positions.includes(tileId);
    let updateData: Record<string, unknown> = {}; 

if (isMine) {
      updateData = {
        status: 'busted',
        revealed_tiles: [...game.revealed_tiles, tileId],
        final_payout: 0,
      };
      
      // Update Database early so we can return the response
      const { error: updateError } = await supabase.from("mines_games").update(updateData).eq("id", gameId);
      if (updateError) throw updateError;

      // ADDED: Return minePositions on Bust
      return new Response(JSON.stringify({ 
        isMine: true, 
        payout_multiplier: 0,
        minePositions: game.mine_positions 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
        const nextMultiplier = calculateNextMultiplier(game.revealed_tiles.length, {
        totalTiles: 25,
        mineCount: game.mine_count,
        houseEdge: 0.03, 
      });

      updateData = {
        revealed_tiles: [...game.revealed_tiles, tileId],
        payout_multiplier: nextMultiplier,
      };
    }

    // 3. Update Database
    const { error: updateError } = await supabase
      .from("mines_games")
      .update(updateData)
      .eq("id", gameId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ 
      isMine, 
      payout_multiplier: updateData.payout_multiplier 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: unknown) {
    let errorMessage = "Unknown error";
    if (err instanceof Error) errorMessage = err.message;
    else if (typeof err === 'object' && err !== null && 'message' in err) {
      errorMessage = String((err as Record<string, unknown>).message);
    }
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
