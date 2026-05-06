import { supabase } from "@/integrations/supabase/client";
import { useQuizStore, resolveBreed, type QuizState } from "@/stores/quizStore";

export function buildOrderPatchForQuiz(
  overrides: { buyerEmail?: string; buyerName?: string } = {},
) {
  const q = useQuizStore.getState();
  const buyerEmail = (overrides.buyerEmail ?? q.buyer_email ?? "").trim().toLowerCase();
  const buyerName = (overrides.buyerName ?? q.buyer_name ?? "").trim();
  const breedResolved = resolveBreed(q);

  return {
    buyer_email: buyerEmail,
    buyer_name: buyerName || null,
    dog_name: q.dog_name,
    dog_breed: breedResolved,
    dog_breed_other: q.dog_breed_other || null,
    dog_gender: q.dog_gender ?? null,
    dog_photo_url: q.dog_photo_url || null,
    dog_personality: q.dog_personality || null,
    dog_memory: q.dog_memory || null,
    letter_to_dog: q.letter_to_dog || null,
    genre: q.genre ?? null,
    voice: q.voice ?? null,
    song_title_idea: q.song_title_idea || null,
    is_gift: q.is_gift,
    recipient_email: q.recipient_email || null,
    delivery_date: q.delivery_date || null,
    personal_note: q.personal_note || null,
    quiz_payload: {
      dog_name: q.dog_name,
      pronunciation: q.pronunciation || null,
      dog_gender: q.dog_gender ?? null,
      dog_breed: q.dog_breed ?? null,
      dog_breed_other: q.dog_breed_other || null,
      dog_breed_resolved: breedResolved,
      dog_photo_url: q.dog_photo_url || null,
      dog_personality: q.dog_personality,
      dog_memory: q.dog_memory,
      letter_to_dog: q.letter_to_dog,
      genre: q.genre ?? null,
      voice: q.voice ?? null,
      song_title_idea: q.song_title_idea || null,
    },
  };
}

/**
 * Ensure an `orders` row exists for the current quiz state and return its
 * orderId. Idempotent: if the quiz store already has an orderId, returns it
 * after a best-effort sync of the latest quiz/contact details.
 */
export async function ensureOrderForQuiz(): Promise<string | null> {
  const q = useQuizStore.getState();
  if (!q.dog_name) return null;

  const patch = buildOrderPatchForQuiz();

  if (q.orderId) {
    // Anonymous browser updates may be blocked by row security; best-effort
    // only. create-checkout also syncs this patch with service permissions
    // immediately before creating the payment session.
    await supabase.from("orders").update(patch).eq("id", q.orderId);
    return q.orderId;
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? null;

  const orderId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const buyerEmail = patch.buyer_email || `pending+${orderId}@pawprintsong.com`;

  const { error: insertError } = await supabase.from("orders").insert({
    id: orderId,
    user_id: userId,
    ...patch,
    buyer_email: buyerEmail,
    amount_cents: 2999,
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

/**
 * Convenience wrapper for components that just need the QuizState shape.
 */
export function getQuizState(): QuizState {
  return useQuizStore.getState();
}
