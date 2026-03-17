import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyMessage } from "https://esm.sh/viem@2.21.0";

serve(async (req: Request) => {
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

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    // Fix: Check if err is an Error object to satisfy strict TS
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 400 });
  }
});
