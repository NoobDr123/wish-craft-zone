// Single source of truth for "is this user an admin who has passed 2FA recently?"
// Returns one of: "loading" | "anonymous" | "not_admin" | "needs_enrollment" | "needs_verification" | "ready"

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AdminGuardState =
  | "loading"
  | "anonymous"
  | "not_admin"
  | "needs_enrollment"
  | "needs_verification"
  | "ready";

export function useAdminGuard() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AdminGuardState>("loading");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (authLoading) {
      setState("loading");
      return;
    }
    if (!user) {
      setState("anonymous");
      return;
    }

    let cancelled = false;
    (async () => {
      const [{ data: roleRow }, { data: mfaRow }, { data: verif }] =
        await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle(),
          supabase
            .from("user_mfa")
            .select("enrolled")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("mfa_verifications")
            .select("expires_at")
            .eq("user_id", user.id)
            .gt("expires_at", new Date().toISOString())
            .order("verified_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      if (cancelled) return;

      if (!roleRow) {
        setState("not_admin");
        return;
      }
      if (!mfaRow?.enrolled) {
        setState("needs_enrollment");
        return;
      }
      if (!verif) {
        setState("needs_verification");
        return;
      }
      setState("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, refreshKey]);

  return {
    state,
    user,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}
