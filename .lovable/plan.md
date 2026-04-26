I audited the current scratcher-to-checkout flow from first principles.

Current issue as found:
- The scratcher does call the backend and recent orders show `payment_status = checkout_started`, live customer IDs, and live payment intent IDs.
- So the backend is often creating something, but the frontend is built around a fragile prefetched PaymentIntent + custom PaymentElement flow.
- The app currently creates a PaymentIntent before the buyer’s real email/name are saved, stores a placeholder email, and then expects the checkout page to reuse that cached intent after navigation/hydration.
- This creates several failure points: hydration timing, stale cached intents, duplicated background calls, placeholder customer data, and mismatch with the intended embedded checkout/session-based setup.
- Live payments readiness is completed, so this is primarily an implementation/flow reliability problem, not an account setup problem.

The fix should make checkout creation authoritative and simple: create the payment session from the checkout page, after the checkout page has the order context, then mount the payment UI from that server response.

Plan:

1. Stabilize the scratcher CTA
- Stop the scratcher from trying to create payment state as a required part of the button path.
- Keep it as a normal link/button to `/checkout` only.
- Optional: only preload Stripe.js from the scratcher, not create an order/payment intent there.
- This removes the race where the page navigation and background payment creation fight each other.

2. Move order/payment creation into checkout as the single source of truth
- On `/checkout`, once quiz state is hydrated, create or reuse exactly one order.
- Save buyer email/name from the quiz immediately, not a `pending+...` placeholder when the quiz already collected real delivery info.
- Then call the backend checkout function once and display a clear loading state until the payment UI is ready.
- Add an explicit retry button if creation fails.

3. Replace the custom PaymentIntent flow with the proper embedded checkout/session flow
- Update `create-checkout` to create a live/sandbox Checkout Session with `ui_mode: "embedded"`, line item using the `ribbonsong_base` lookup price, and `return_url` back to `/checkout/return`.
- Return the Checkout Session `client_secret` and session ID, instead of a raw PaymentIntent client secret.
- Store `stripe_checkout_session_id`, `stripe_customer_id`, `stripe_env`, and `payment_status = checkout_started` on the order.
- Keep stale customer handling: if an existing customer ID is invalid for the current live/sandbox environment, create a fresh customer.

4. Update the checkout UI
- Replace `CustomPaymentForm`/PaymentElement usage on the base checkout page with Stripe Embedded Checkout:
  - `EmbeddedCheckoutProvider`
  - `EmbeddedCheckout`
- This gives buyers the complete Stripe-hosted payment experience inline and avoids the fragile manual confirm logic.
- Keep the test-mode banner and existing order summary.
- Disable/adjust promo code behavior if needed so it does not mutate a PaymentIntent that no longer exists. If promo codes must remain on this pass, apply the promo before creating the Checkout Session, then create the session with the discounted amount or existing price/discount logic.

5. Update payment completion handling
- Update `payments-webhook` to handle `checkout.session.completed` as the primary completion event for base orders.
- Use session metadata (`orderId`, `kind: base_order`) to mark the order paid and move the buyer to the upsell flow.
- Keep `payment_intent.succeeded` support as a fallback for old in-flight orders.
- Update `/checkout/return` to accept `session_id`, call/lookup confirmation by session, and then route to `/upsell-1` or `/processing`.

6. Add diagnostics so this stops being invisible
- Add structured logs to `create-checkout` for:
  - order ID
  - environment live/sandbox
  - whether a new or existing customer was used
  - session created or exact error category
- Add frontend error messages that distinguish:
  - missing quiz state
  - order insert failed
  - checkout session creation failed
  - payment UI failed to mount
- This will make the next failure actionable rather than a generic “checkout not created.”

7. Verify after implementation
- Deploy the updated backend payment functions.
- Test `create-checkout` directly with a recent order.
- Run the full preview flow from incognito: quiz → almost there → scratcher reveal → checkout → embedded payment loads.
- Confirm a live-mode order gets a checkout session ID and moves to upsell after successful payment.

Technical notes:
- Do not edit generated backend client/type files.
- Keep `verify_jwt = false` for payment-related backend functions.
- Continue using the existing shared payment gateway utility for all Stripe API calls.
- Do not rely on direct Stripe secret keys.
- Existing PaymentIntent-based orders should remain supported during transition so no in-flight orders break.

After this plan is approved, I’ll implement the changes directly.