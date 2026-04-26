// Funnel + analytics tracking. Writes anonymously to public.quiz_events and
// public.page_sessions. Safe to call from any client surface.
//
// Session ID is stored in localStorage and survives until explicit reset.
// All calls are fire-and-forget — never block UI on a failed insert.

import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "rs_session_id";
const SESSION_INIT_KEY = "rs_session_init";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getUtm(): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
} {
  if (typeof window === "undefined") return {};
  try {
    const url = new URL(window.location.href);
    return {
      utm_source: url.searchParams.get("utm_source") ?? undefined,
      utm_medium: url.searchParams.get("utm_medium") ?? undefined,
      utm_campaign: url.searchParams.get("utm_campaign") ?? undefined,
    };
  } catch {
    return {};
  }
}

/** Ensure a page_sessions row exists for this visitor. Idempotent. */
export async function ensureSession(): Promise<void> {
  if (typeof window === "undefined") return;
  const sessionId = getSessionId();
  const initialized = localStorage.getItem(SESSION_INIT_KEY);

  try {
    // Always update last_seen on any call
    if (initialized === sessionId) {
      await supabase
        .from("page_sessions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("session_id", sessionId);
      return;
    }

    const utm = getUtm();
    await supabase.from("page_sessions").insert({
      session_id: sessionId,
      user_agent: navigator.userAgent.slice(0, 500),
      referrer: document.referrer?.slice(0, 500) || null,
      landing_path: window.location.pathname,
      host: window.location.host?.slice(0, 200) || null,
      utm_source: utm.utm_source ?? null,
      utm_medium: utm.utm_medium ?? null,
      utm_campaign: utm.utm_campaign ?? null,
    });
    localStorage.setItem(SESSION_INIT_KEY, sessionId);
  } catch (err) {
    // Don't block UI on tracking failures
    console.warn("[tracking] ensureSession failed", err);
  }
}

export type TrackEventInput = {
  type: string;
  stepIndex?: number;
  stepKey?: string;
  timeOnStepMs?: number;
  payload?: Record<string, unknown>;
  buyerEmail?: string;
  orderId?: string;
  upsellType?: string;
  amountCents?: number;
};

/** Fire-and-forget event log. */
export async function track(input: TrackEventInput): Promise<void> {
  if (typeof window === "undefined") return;
  const sessionId = getSessionId();
  try {
    // Best-effort ensure session exists
    void ensureSession();
    await supabase.from("quiz_events").insert({
      session_id: sessionId,
      event_type: input.type,
      step_index: input.stepIndex ?? null,
      step_key: input.stepKey ?? null,
      time_on_step_ms: input.timeOnStepMs ?? null,
      payload: (input.payload ?? null) as never,
      buyer_email: input.buyerEmail?.toLowerCase() ?? null,
      order_id: input.orderId ?? null,
      upsell_type: input.upsellType ?? null,
      amount_cents: input.amountCents ?? null,
    });
  } catch (err) {
    console.warn("[tracking] track failed", input.type, err);
  }
}

/** Attach buyer email + order id to the page_sessions row once known. */
export async function attachSessionIdentity(input: {
  buyerEmail?: string;
  orderId?: string;
  userId?: string;
}): Promise<void> {
  if (typeof window === "undefined") return;
  const sessionId = getSessionId();
  try {
    const patch: {
      last_seen_at: string;
      buyer_email?: string;
      order_id?: string;
      user_id?: string;
    } = {
      last_seen_at: new Date().toISOString(),
    };
    if (input.buyerEmail) patch.buyer_email = input.buyerEmail.toLowerCase();
    if (input.orderId) patch.order_id = input.orderId;
    if (input.userId) patch.user_id = input.userId;
    await supabase
      .from("page_sessions")
      .update(patch)
      .eq("session_id", sessionId);
  } catch (err) {
    console.warn("[tracking] attachSessionIdentity failed", err);
  }
}
