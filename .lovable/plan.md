I found two concrete problems in the payment-to-upsell flow:

1. The card payment succeeded, but the browser did not reliably land on the payment return page, so the backend confirmation fallback was never called automatically. That left the order stuck as `checkout_started` instead of being marked paid and routed onward.
2. The upsell charge function is still authorizing with the old “checkout session” field, while this app now uses PaymentIntent IDs. Even when users reach upsells, accepting an upsell can silently fail unless the auto-login has already completed.

Plan to fix it:

1. Make payment success confirm immediately
   - In `CustomPaymentForm`, after Stripe returns `paymentIntent.status === "succeeded"`, call the existing `confirm-payment` backend function immediately.
   - Use that response to route directly:
     - normal paid order -> `/upsell-1`
     - T3ST/test fast-track order -> `/processing`
   - Keep `/checkout/return` as the fallback for wallets, 3DS, redirects, or any case where Stripe does not return a full PaymentIntent to the browser.

2. Keep the return page as a safety net
   - Leave `/checkout/return` polling and confirmation in place.
   - Improve it so if `confirm-payment` returns a paid result, it can navigate without waiting for another slow database poll.

3. Fix upsell authorization for the current payment flow
   - Update `charge-upsell` to accept the base PaymentIntent ID as the buyer’s proof, not only the old checkout session ID.
   - This matches what `/checkout/return` already stores as `checkoutSessionId` in the quiz state.

4. Prevent stale checkout reuse
   - Clear the prefetched checkout cache after a successful payment so a paid PaymentIntent is never reused if the user reloads or gets bounced back.

5. Add useful diagnostics
   - Track `payment_success` with order ID, PaymentIntent ID, source (`card` / `express`), and destination.
   - Add console/backend logs around direct confirmation and routing so if any device still fails, the next report shows exactly where.

6. Validate after implementation
   - Run type/build checks.
   - Test the backend confirmation function with a paid PaymentIntent.
   - Verify normal card flow routes to `/upsell-1` and T3ST routes to `/processing` as intended.
   - Verify upsell accept no longer fails authorization when using the PaymentIntent ID.

Important note: the T3ST promo code is intentionally designed to skip upsell pages because it auto-adds all upsells and fast-tracks the order. For testing the actual upsell screens, use a normal successful card payment without T3ST, or we can add a second admin test code that charges a low amount but still shows the upsell route.