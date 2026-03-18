import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { supabase } from '@/app/lib/supabaseClient';

export function useWeb3Login() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const login = async () => {
    if (!address) return false;
    setIsLoggingIn(true);

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
        // Officially log the user into the Supabase client!
        const { error } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: result.password,
        });

        if (error) throw error;
        
        console.log("Successfully authenticated client with Supabase!");
        return true;
      }
    } catch (error) {
      console.error("SIWE Login Failed:", error);
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  };

  return { login, isLoggingIn };
}
