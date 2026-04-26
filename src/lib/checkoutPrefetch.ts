import { supabase } from "@/integrations/supabase/client";
import { useQuizStore, journeyStageOf, tenseOf, type QuizState } from "@/stores/quizStore";

function resolveRelationship(q: QuizState) {
  return q.relationship === "Other" && q.relationship_other.trim()
    ? q.relationship_other.trim()
    : (q.relationship ?? null);
}

export function buildOrderPatchForQuiz(
  overrides: { buyerEmail?: string; buyerName?: string } = {},
) {
  const q = useQuizStore.getState();
  const journey = journeyStageOf(q.stage);
  const tense = tenseOf(q.stage);
  const relationshipResolved = resolveRelationship(q);
  const buyerEmail = (overrides.buyerEmail ?? q.buyer_email ?? "").trim().toLowerCase();
  const buyerName = (overrides.buyerName ?? q.buyer_name ?? "").trim();

  return {
    buyer_email: buyerEmail,
    buyer_name: buyerName || null,
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
  };
}

/**
 * Ensure an `orders` row exists for the current quiz state and return its
 * orderId. Idempotent: if the quiz store already has an orderId, returns it
 * after a best-effort sync of the latest quiz/contact details.
 *
 * NOTE: This NO LONGER creates Stripe payment state. The custom on-page
 * Stripe Elements component creates the PaymentIntent on demand once it has
 * an orderId. If the anonymous client insert is blocked, we still return a
 * generated orderId; create-payment-intent can create the order from the
 * quiz snapshot with service permissions.
 */
export async function ensureOrderForQuiz(): Promise<string | null> {
  const q = useQuizStore.getState();
  if (!q.recipient_name) return null;

  const patch = buildOrderPatchForQuiz();

  if (q.orderId) {
    // Anonymous browser updates may be blocked by row security, so this is
    // best-effort only. The create-checkout function also syncs this patch
    // with service permissions immediately before creating the payment session.
    await supabase.from("orders").update(patch).eq("id", q.orderId);
    return q.orderId;
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? null;

  const orderId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const buyerEmail = patch.buyer_email || `pending+${orderId}@ribbonsong.com`;

  const { error: insertError } = await supabase.from("orders").insert({
    id: orderId,
    user_id: userId,
    ...patch,
    buyer_email: buyerEmail,
    amount_cents: 4999,
    currency: "USD",
    status: "pending_payment",
    payment_status: "pending",
  });

  if (insertError) {
    console.error("[ensureOrderForQuiz] order insert failed:", insertError);
    q.set("orderId", orderId);
    return orderId;
  }

  q.set("orderId", orderId);
  return orderId;
}
