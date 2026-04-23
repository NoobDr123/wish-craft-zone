
Goal: do a true end-to-end checkout repair, not another narrow patch.

What’s most likely wrong now
1. The checkout flow is fragile at the handoff points:
   - browser inserts `orders`
   - backend creates embedded payment session
   - backend writes `stripe_checkout_session_id` back onto the order
   - return page looks the order up by `session_id`
   - upsells require that same session ID to match
2. The current code still has silent failure paths:
   - `create-checkout` updates the order with the session ID but does not fail if that update fails
   - the return page eventually advances even if it never resolved a paid order cleanly
   - upsells can silently fail authorization if the session never got stored
3. The funnel has route inconsistencies (`/almost-there` -> `/scratch` -> `/checkout`) that make debugging harder and can hide where the buyer is actually breaking.
4. The root hydration warning is mostly browser-extension noise, but it can bury the real checkout error in the console.

Implementation plan

1. Harden the order -> checkout session link
- Update `supabase/functions/create-checkout/index.ts` so it treats the post-session order update as required, not best-effort.
- If writing `stripe_checkout_session_id` or `payment_status: "checkout_started"` fails, return a real error instead of a fake-success `clientSecret`.
- Return a compact debug-safe response shape so the frontend can distinguish:
  - order insert failed
  - session creation failed
  - session persistence failed

2. Make the checkout page show the real failure point
- Update `src/routes/checkout.tsx` to handle the three failure stages separately:
  - order creation
  - session creation
  - session persistence
- Keep the buyer-friendly copy, but log structured details for each stage so preview debugging becomes obvious.
- Save the created order ID immediately in state before mounting embedded checkout.

3. Make the return page resilient instead of optimistic
- Update `src/routes/checkout.return.tsx` so it does not blindly continue after timeout unless it has a verified order.
- Add fallback lookup behavior using the stored order ID when available, instead of depending only on `stripe_checkout_session_id`.
- Keep polling for the paid status, but show a proper recovery state if the order/session link is missing rather than pushing the user deeper into the funnel with broken context.

4. Fix upsell authorization dependence on missing session linkage
- Review and tighten `supabase/functions/charge-upsell/index.ts` so the order can still be validated cleanly when the user already owns the order by email/account, while preserving the current security model.
- Ensure upsells do not silently degrade because the base checkout never saved `stripe_checkout_session_id`.

5. Align the funnel routes and CTA flow
- Review `/almost-there`, `/scratch`, and `/checkout` so the payment path is deterministic.
- Keep the scratch-card offer if desired, but make the transition into payment explicit and consistent.
- Remove ambiguity about where “continue” actually sends the buyer.

6. Reduce console noise from false hydration mismatches
- Update `src/routes/__root.tsx` to tolerate extension-injected attributes on the root shell so fake hydration warnings do not mask payment errors during testing.
- This will not fix payments directly, but it makes real checkout failures much easier to spot.

7. Verify the full payment lifecycle
- Test the whole path in sandbox:
  `create -> almost-there -> scratch -> checkout -> payment -> checkout/return -> upsell-1`
- Confirm the order transitions correctly through:
```text
pending_payment
-> checkout_started
-> paid / awaiting_upsells
```
- Confirm the order row has:
  - `stripe_checkout_session_id`
  - `stripe_payment_intent_id`
  - `stripe_customer_id`
  - `stripe_payment_method_id`
- Confirm upsells receive a valid `orderId` and session context after the return step.

Files to update
- `src/routes/checkout.tsx`
- `src/routes/checkout.return.tsx`
- `src/routes/almost-there.tsx`
- `src/routes/scratch.tsx`
- `src/routes/__root.tsx`
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/charge-upsell/index.ts`

Possible backend migration
- Only if needed after verification: add one small migration to make any missing `orders` grants/policies fully explicit again. The current schema looks mostly correct, so this is a fallback, not the first move.

Technical details
- Keep embedded payments; do not switch to redirect checkout.
- Do not weaken RLS or make sensitive order data public.
- Do not rely on client-side storage for authorization.
- The main fix is making the checkout session write-back and return-page resolution deterministic instead of best-effort.
