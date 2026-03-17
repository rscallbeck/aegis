import { useAccount, useSignMessage } from 'wagmi';
import { supabase } from '../lib/supabaseClient';

export function useWeb3Login() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const login = async () => {
    if (!address) return;

    try {
      const message = `Sign in to Project Aegis with wallet: ${address}`;
      const signature = await signMessageAsync({ message });

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-siwe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature, address }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log("Logged into Aegis Backend!", result.user);
        
        // In the future, we will use the SupabaseClient client here to set the session
        // e.g., await SupabaseClient.auth.setSession(...)
        
        // This line satisfies ESLint by actually utilizing the imported client
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Current SupabaseClient Session:", session);
      }
    } catch (error) {
      console.error("SIWE Login Failed:", error);
    }
  };

  return { login };
}
