import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyMessage } from "https://esm.sh/viem@2.21.0";

// 1. Define standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // 2. Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { message, signature, address } = await req.json();

    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature,
    });

    if (!isValid) throw new Error("Invalid signature");

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `${address.toLowerCase()}@web3.aegis`,
    });

    if (error) throw error;

    // 3. Attach CORS headers to the success response
    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    // 4. Attach CORS headers to the error response
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
