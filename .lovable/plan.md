Plan to fix the Link redirect issue and keep buyers on-site:

1. Remove Stripe Link from the checkout UI
   - Update the express wallet row to show only Apple Pay and Google Pay.
   - Set Link to `never` in the express checkout options so it cannot open the Link website flow.
   - Keep Link disabled inside the card form as well, so customers use on-page card, Apple Pay, or Google Pay only.

2. Strengthen successful payment routing
   - Keep the direct confirmation path for successful card payments.
   - Replace hard browser reload navigation where possible with app navigation to `/upsell-1` or `/processing`, while preserving the return page as a fallback for wallet/3DS edge cases.
   - Make sure `confirm-payment` is called with the PaymentIntent id before routing.

3. Add safety logging for payment method outcomes
   - Add clear console logs for card, Apple Pay, Google Pay, and fallback return-page paths so we can see exactly which route was used if another payment gets stuck.

4. Validate with the existing backend state
   - Confirm the latest paid order still maps correctly to `/upsell-1` unless it is the `T3ST` fast-track code.
   - Deploy any touched payment backend functions if needed, then type-check/build the app.

Technical details:
- Primary file: `src/components/CustomPaymentForm.tsx`
- Likely change: `paymentMethods: { applePay: "always", googlePay: "always", link: "never" }`
- No database migration is expected.