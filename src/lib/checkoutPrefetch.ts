import { supabase } from "@/integrations/supabase/client";
import { stripeEnvironment, preloadStripe } from "@/lib/stripe";
import { useQuizStore, journeyStageOf, tenseOf } from "@/stores/quizStore";

export interface PrefetchedCheckout {
  orderId: string;
  clientSecret: string;
  paymentIntentId: string;
  createdAt: number;
}

let inflight: Promise<PrefetchedCheckout | null> | null = null;
let cached: PrefetchedCheckout | null = null;

/**
 * How long a prefetched PaymentIntent is considered fresh. Stripe PIs
 * remain usable much longer, but we re-create after 10 minutes to avoid
 * stale state if the user lingers.
 */
const TTL_MS = 10 * 60 * 1000;

export function getPrefetchedCheckout(): PrefetchedCheckout | null {
  if (!cached) return null;
  if (Date.now() - cached.createdAt > TTL_MS) {
    cached = null;
    return null;
  }
  return cached;
}

export function clearPrefetchedCheckout() {
  cached = null;
  inflight = null;
}

/**
 * Kick off order insert + Stripe PaymentIntent creation in the background.
 * Idempotent and safe to call multiple times — only the first call does work.
 *
 * Also warms the Stripe.js bundle in parallel so the checkout page can
 * mount <Elements> with zero additional network wait.
 */
export function prefetchCheckout(): Promise<PrefetchedCheckout | null> {
  // Warm the Stripe.js script regardless of inflight state.
  try {
    preloadStripe();
  } catch {
    // No publishable key yet — ignore; checkout page will surface the error.
  }

  if (cached && Date.now() - cached.createdAt <= TTL_MS) {
    return Promise.resolve(cached);
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const q = useQuizStore.getState();
      if (!q.recipient_name) return null;

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;

      const journey = journeyStageOf(q.stage);
      const tense = tenseOf(q.stage);
      const relationshipResolved =
        q.relationship === "Other" && q.relationship_other.trim()
          ? q.relationship_other.trim()
          : (q.relationship ?? null);

      const newOrderId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const placeholderEmail = `pending+${newOrderId}@ribbonsong.com`;

      const { error: insertError } = await supabase.from("orders").insert({
        id: newOrderId,
        user_id: userId,
        buyer_email: placeholderEmail,
        buyer_name: null,
        recipient_name: q.recipient_name,
        relationship: relationshipResolved,
        genre: q.genre ?? null,
        tempo: q.tempo ?? null,
        voice: q.voice ?? null,
        song_title_idea: q.song_title_idea || null,
        is_gift: q.is_gift,
        recipient_email: q.recipient_email || null,
        delivery_date: q.delivery_date || null,
        personal_note: q.personal_note || null,
        amount_cents: 4999,
        currency: "USD",
        status: "pending_payment",
        payment_status: "pending",
        priority: journey === "hospice" ? "hospice" : "standard",
        quiz_payload: {
          q1_relationship: q.relationship,
          q1_relationship_other: q.relationship_other || null,
          q1_recipient_name: q.recipient_name,
          q1_pronunciation: q.pronunciation || null,
          q1_age_range: q.age_range || null,
          q3_journey: q.stage,
          q3_journey_stage: journey,
          q3_tense: tense,
          q4_fighting_for: q.fighting_for,
          q5_qualities: q.qualities,
          q6_shared_memory: q.shared_memory,
          q7_theme: q.message,
          q8_letter: q.personal_words,
          q9_genre: q.genre,
          q9_tempo: q.tempo,
          q9_voice: q.voice,
          q9_song_title_idea: q.song_title_idea || null,
          stage: q.stage,
          cancer_type: q.cancer_type,
          message: q.message,
          fighting_for: q.fighting_for,
          signature_strength: q.signature_strength,
          hardest_moment: q.hardest_moment,
          what_helps_most: q.what_helps_most,
          qualities: q.qualities,
          inside_joke: q.inside_joke,
          shared_memory: q.shared_memory,
          little_things: q.little_things,
          faith_or_beliefs: q.faith_or_beliefs,
          personal_words: q.personal_words,
          hope_for_them: q.hope_for_them,
          relationship: relationshipResolved,
          journey_stage: journey,
          tense,
        },
      });

      if (insertError) {
        console.error("[prefetchCheckout] order insert failed:", insertError);
        return null;
      }

      q.set("orderId", newOrderId);

      const { data, error: fnError } = await supabase.functions.invoke(
        "create-checkout",
        { body: { orderId: newOrderId, environment: stripeEnvironment } },
      );

      if (fnError || !data?.clientSecret) {
        console.error("[prefetchCheckout] create-checkout failed:", fnError, data);
        return null;
      }

      cached = {
        orderId: newOrderId,
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        createdAt: Date.now(),
      };
      return cached;
    } catch (e) {
      console.error("[prefetchCheckout] unexpected error:", e);
      return null;
    } finally {
      // Allow retries if this attempt failed (cached will be null in that case).
      inflight = null;
    }
  })();

  return inflight;
}
