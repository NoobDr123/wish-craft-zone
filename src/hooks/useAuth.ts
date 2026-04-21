import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener first
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      // Whenever a user signs in (magic link, OAuth, etc.), defer a call
      // to claim any guest orders that were placed with the same email
      // before they had an account. The signup trigger covers brand-new
      // users; this covers returning users who bought as guests.
      if (event === "SIGNED_IN" && s?.user) {
        setTimeout(() => {
          supabase.rpc("claim_my_guest_orders").then(({ error }) => {
            if (error) console.error("claim_my_guest_orders failed:", error);
          });
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, user, loading, signOut };
}
