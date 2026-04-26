I found the main issue: the app currently has a nested TanStack route conflict. `src/routes/checkout.tsx` acts as a parent route for `/checkout/return`, so when Stripe sends users to `/checkout/return?payment_intent_id=...`, the server-rendered page can still show the checkout screen instead of the return-confirmation screen. That explains why customers remain on the return URL and do not advance to `/upsell-1` reliably.

Plan to fix fast:

1. Make `/checkout/return` an independent top-level route
   - Rename the return route file from `checkout.return.tsx` to the flat escaped path convention for a literal slash: `checkout[.]return.tsx`.
   - Keep its `createFileRoute("/checkout/return")` definition.
   - This prevents it from being nested under `/checkout`, so the return page renders by itself instead of being swallowed by the checkout page.

2. Add a belt-and-suspenders redirect guard inside `/checkout`
   - At the very top of the checkout route component, detect if `window.location.pathname === "/checkout/return"`.
   - If so, immediately render the same return-page component or hard-redirect into the standalone return route logic instead of rendering payment checkout.
   - This protects current/stale bundles and any edge case where the nested route still resolves through the checkout component.

3. Make the return page route buyers to upsells even if local state is missing
   - Keep calling `confirm-payment` using the `payment_intent_id` from the URL.
   - On paid confirmation, persist `orderId`, `checkoutSessionId`, buyer email if available, then hard-redirect to `/upsell-1` unless the order is already marked complete.
   - Preserve the polling fallback, but make the timeout path less dangerous: only send to upsells when we have an order ID; otherwise show a clear support message instead of looping on checkout.

4. Ensure upsell pages do not depend only on localStorage
   - Let upsell pages use the `checkoutSessionId`/PaymentIntent proof from store as they do now.
   - If the user lands on upsells with missing local store but the order was just confirmed, the return page will have written the needed state before redirecting.

5. Verify all payment entry points
   - Card form: `confirmCardPayment` success -> `/checkout/return?payment_intent_id=...` -> confirm -> `/upsell-1`.
   - Apple Pay / Google Pay / Link: Express confirm success -> same return URL -> confirm -> `/upsell-1`.
   - Promo amount changes: still remount payment Elements with the discounted amount.

Technical details:

```text
Before:
/checkout
  └─ /return  (nested child route generated from checkout.return.tsx)

Problem:
Direct visit to /checkout/return can SSR/render checkout parent UI, so return confirmation code may not take control.

After:
/checkout         payment page only
/checkout/return  standalone confirmation/redirect page
```

Files to change after approval:
- `src/routes/checkout.return.tsx` -> rename to `src/routes/checkout[.]return.tsx`
- `src/routes/checkout.tsx`
- Possibly small export cleanup in the return route so the checkout guard can reuse the return component if needed

No database migration is needed.