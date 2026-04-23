# Checkout Performance Analysis & Speed-Up Plan

## What I observed (the diagnosis)

The duplicate `create-checkout` calls you saw earlier are **fixed** — the new logs show only **one call per page visit**. The remaining lag has different causes. Here's where each second is going:

### Time breakdown per checkout page load

```text
USER LANDS ON /checkout
│
├─ 1. Page HTML + JS bundle                    ~300-600 ms   (browser)
├─ 2. SSR loader: featured_samples query       ~150-300 ms   (Supabase)
├─ 3. POST /create-checkout (edge function)    ~800-1500 ms  ← BIGGEST
│       Inside this single call, sequentially:
│       a. supabase.auth.getUser()              ~80 ms
│       b. stripe.prices.list()                 ~250 ms      ← every time
│       c. stripe.customers.create()            ~300 ms      ← every time
│       d. stripe.paymentIntents.create()       ~400 ms      ← every time
│       e. supabase orders.update()             ~100 ms
│       (a-e run one after the other)
│
├─ 4. Stripe.js loads (loadStripe)             ~400-800 ms   (CDN)
├─ 5. Elements iframe + ExpressCheckout        ~500-1000 ms  (Stripe)
├─ 6. hCaptcha invisible iframe                ~300-500 ms   (Stripe risk)
└─ 7. PaymentElement card iframe               ~400-700 ms

TOTAL until user can tap Apple Pay: ~3-5 seconds on mobile
```

The screen looks "lagged" because steps 3 + 4 + 5 are blocking the express-checkout buttons from appearing.

## The fixes (biggest wins first)

### 1. Cache the Stripe Price lookup (saves ~250 ms every call)

Currently every checkout call does `stripe.prices.list({ lookup_keys: ["ribbonsong_base"] })`. The price never changes between deploys. Cache it in a module-level variable inside the edge function so subsequent invocations skip the round-trip.

### 2. Run Stripe Customer + PaymentIntent creation in parallel (saves ~300 ms)

The code creates a customer, then waits, then creates a PaymentIntent attached to that customer. We can:
- Skip pre-creating a Customer entirely. Stripe will auto-create one from the PaymentElement billing details on confirm.
- OR create the PaymentIntent without `customer` and attach the customer later via webhook (we already have `setup_future_usage` saved on the PI).
- Skip the `orders.update` round-trip by writing those fields when the order row is first inserted on the client (we already have the PI id back at that point).

### 3. Preload Stripe.js earlier (saves ~400-800 ms perceived)

`getStripe()` only fires when the checkout page mounts. Move the `loadStripe()` call to:
- Trigger on the **previous page** (`/almost-there`) the moment the user lands there, OR
- Add `<link rel="preload" as="script" href="https://js.stripe.com/v3/">` and `<link rel="preconnect" href="https://js.stripe.com">` to `__root.tsx` so the browser starts the TLS handshake before they ever click "Continue".

### 4. Prefetch /create-checkout on hover/intent (saves ~1 second perceived)

On the `/almost-there` "Continue to checkout" button, fire the `create-checkout` POST as soon as the button is hovered or the page renders (only the order insert + PI creation, no UI). When the user lands on /checkout, the `clientSecret` is already in memory and we mount `<Elements>` instantly.

### 5. Defer below-the-fold work (saves main-thread time)

These currently load at page mount and compete for bandwidth/CPU with Stripe:
- 3 audio samples from `featured_samples` (loader query + audio URLs)
- The `<AudioPlayer>` components

Move the samples query out of the route loader and into a `useEffect` that fires AFTER `clientSecret` is set. Lazy-mount the audio cards only when scrolled into view (IntersectionObserver). This keeps the critical path focused on payment.

### 6. Skinnier skeleton above the fold

Right now the placeholder is three grey blocks. Replace with a static "Apple Pay / Google Pay / Card" mock skeleton that matches the real form's footprint exactly — eliminates layout shift and makes the perceived load feel instantaneous when the real form swaps in.

## Expected result

```text
BEFORE: ~3-5 s until user can tap Apple Pay
AFTER:  ~600-1200 ms (express buttons appear within 1 second of landing)
```

## Files I will change

- `supabase/functions/create-checkout/index.ts` — cache price, drop pre-customer-create, drop update round-trip
- `src/routes/__root.tsx` — add Stripe preconnect/preload tags
- `src/routes/almost-there.tsx` — prefetch create-checkout on continue button hover/mount
- `src/routes/checkout.tsx` — read prefetched clientSecret if present; lazy-load samples; better skeleton
- `src/lib/stripe.ts` — eager-init Stripe.js on import (no behavior change, just earlier)
- `src/components/CustomPaymentForm.tsx` — render shell immediately, swap in form when ready

## Out of scope (not needed)

- The duplicate-call bug is already fixed; no further work there.
- Database indexes — the orders insert/update is fast.
- Edge-function cold-start tuning — secondary; cache + parallelization wins more.
