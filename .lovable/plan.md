# Final implementation — ship-ready

Phase 1 (DB schema) is already deployed. This plan covers all remaining work in 4 waves, then a launch audit. Base price is already $49.99 in `src/config/pricing.ts`.

---

## Wave A — Backend (edge functions)

### A1. `approve-reaction` (new)
Admin-only. POSTs `{ reactionVideoId }`.
- Verify caller has `admin` role.
- Set `reaction_videos.status='approved'`.
- Issue `reaction_reward_codes` row via `issue_reward_code_for_order` RPC (already exists, defaults to 2 free songs).
- Refund full `amount_paid_cents` on the original PaymentIntent through the gateway (`createStripeClient(env).refunds.create(...)`), store `refund_stripe_id` + `refund_amount_cents` + `refund_synced_at` on both `reaction_reward_codes` and a new `refund_requests` row (status `approved`, request_type `refund`).
- Mark `approved_at` + `approved_by`, set reward status `unlocked`.
- Send `reaction-approved` transactional email with the reward code + "we refunded $X to your card".

### A2. `reject-reaction` (new)
Admin-only. POSTs `{ reactionVideoId, reason }`.
- Set `reaction_videos.status='rejected'`, store reason.
- Send `reaction-rejected` email (kept short, encouraging).

### A3. `redeem-reward-code` (new)
Logged-in user. POSTs `{ code }`. Returns `{ ok, free_songs_remaining, owner_user_id }`.
- Validate code belongs to caller (user_id OR jwt email match).
- Status must be `unlocked` and `free_songs_remaining > 0`.
- Just validates — does not decrement (decrement happens at order creation via A4).

### A4. `create-checkout` (modify) — free song path
When request body has `rewardCode`:
- Re-validate via RPC, atomically decrement `free_songs_remaining` (UPDATE ... WHERE free_songs_remaining > 0 RETURNING).
- Create order with `amount_cents=0`, `payment_status='paid'`, `source_kind='free_reward'`, `source_reward_code_id`, `delivery_tier='next_day_local'`, `scheduled_delivery_at` = next 9am in buyer's locale (use UTC + 8h fallback).
- Skip Stripe entirely. Skip upsells. Go straight to `received` → brief generation.
- If reward exhausted, set `fully_redeemed_at`.

### A5. `create-checkout` (modify) — 10% returning code path
Already supported via existing promo system; just ensure `redeem_promo_code` ownership check fires (it does — verified in functions list).

### A6. `unlock-second-variant` (new)
Logged-in user. POSTs `{ orderId }`. $5 charge using saved card.
- Verify user owns order, order has 2 variants, `second_variant_unlocked_at` is null.
- Require `stripe_payment_method_id` AND `stripe_customer_id` on order — if missing, return 402 `no_saved_card` (UI disables button).
- `stripe.paymentIntents.create({ amount: 500, customer, payment_method, off_session: true, confirm: true })`.
- On success: set `second_variant_unlocked_at = now()`. Return both variants.

### A7. `regenerate-song` (new)
Logged-in user. POSTs `{ orderId, changeNotes }`.
- Verify user owns order, `regeneration_used_at` is null.
- Build Claude prompt with: original `quiz_payload`, original `brief` (Claude lyrics+style), and the user's changeNotes ("here's what they want changed").
- Call Claude → new brief → enqueue Suno via existing `submit-to-kie`.
- Set `regeneration_used_at`, status back to `music_generating`. Don't create a new order — replace `audio_variants` once new variants come back.
- Free for first regen; subsequent attempts blocked with "use a free revision or order again".

### A8. `deliver-song` (modify)
On successful delivery, additionally:
- Auto-issue a `returning_10pct` promo via `issue_personal_promo_code(_kind='returning_10pct', _discount_pct=10, owner_user_id, owner_email, _issued_for_order_id, _expires_in_days=180)`.
- Pass that code into the delivery email (existing `song-delivered` template gets a "10% off your next song: WELCOME-XXXX-XXXX" block).

### A9. `payments-webhook` (audit-only)
Verify it correctly attaches `stripe_payment_method_id` + `stripe_customer_id` to orders so A6 can charge. If missing — fix.

---

## Wave B — Portal rebuild (`src/routes/portal.$id.tsx`)

Full rewrite with RibbonSong branding (SiteHeader/SiteFooter, gradient-warm background, Fraunces display font). New tab structure:

1. **Player** — VinylPlayer + lyrics. If `audio_variants.length === 2` and `second_variant_unlocked_at` is set, show variant switcher (A/B). If not unlocked, show big "Unlock the alternate version — $5" card. Disabled with tooltip "Saved card required" when no PM on file. Posts to A6.
2. **Share** — public listen link `/listen/$id` (already exists), plus prebuilt share buttons: WhatsApp, Telegram, X, Email, Copy link.
3. **Re-found program** — full explainer (what it is, how it works, what they get: refund + 2 free songs). Reaction upload tab content lives here. After admin approves: show the reward code prominently + "2 of 2 free songs left" counter + button "Use a free song now" → `/create?reward=CODE`.
4. **Revision** — keep existing free revision form. Add toggle "Or regenerate with new prompt context" → opens regeneration modal that shows the original quiz answers (read-only) + textarea "What do you want to change?" → posts to A7.
5. **Refund / gift card** — keep existing form (this is the manual fallback path for non-reaction refunds).

Shared "Your rewards" sidebar card showing:
- Reaction reward code + free songs remaining (link to `/create?reward=CODE`)
- 10% returning promo code (link to `/create?promo=CODE`)
- Pulled from `reaction_reward_codes` and `promo_codes` tables (RLS already lets users see their own).

### `src/routes/create.tsx` (modify)
- If URL has `?reward=CODE`: validate via A3, lock the form into "free song" mode, show banner "Free song — code CODE — delivery: tomorrow morning". Submit posts to A4 with `rewardCode`. No upsells shown.
- If URL has `?promo=CODE`: pre-fill promo input on checkout (existing flow).

### `src/routes/checkout.tsx` (modify)
- When `source_kind='free_reward'`, skip checkout entirely — already routed past.

---

## Wave C — Admin UI (`src/routes/admin.tsx`)

Add a "Reactions" tab listing pending `reaction_videos`. Each row:
- Inline video player (signed URL from `reactions` bucket).
- Caption, buyer email, order link.
- Buttons: **Approve** (calls A1) and **Reject** (opens modal for reason → calls A2).
- Refresh after action. Show approved/rejected status.

---

## Wave D — Emails (templates + sends)

Create two new email templates in `src/lib/email-templates/`:
- `reaction-approved.tsx` — "Your reaction video was approved! We refunded $X to your card and gave you 2 free songs. Your code: RIBBON-XXXX-XXXX. Use it at ribbonsong.com/create?reward=CODE."
- `reaction-rejected.tsx` — short, kind, with reason.

Wire into `send-app-email` switch. Update existing `song-delivered.tsx` to include the auto-issued 10% returning code block.

Email infra is already set up (queue, cron, domain). New templates auto-deploy.

---

## Wave E — Launch audit (read-only checks → fix-as-found)

1. **Pricing**: `src/config/pricing.ts` = $49.99 ✓. Audit ALL price strings across landers/checkout/upsells — confirm $99.99 strikethrough and $49.99 active everywhere. Fix any drift.
2. **Stripe live mode**: call `payments--get_go_live_status`. Confirm live keys + webhook secret present (they are — `STRIPE_LIVE_API_KEY`, `PAYMENTS_LIVE_WEBHOOK_SECRET`).
3. **Pixel/analytics**: grep `src/lib/tracking.ts` and routes for FB Pixel init + `Purchase`/`InitiateCheckout`/`AddToCart`/`Lead` events. Verify pixel ID is set and Purchase fires on `/checkout/return` with correct `value` + `currency`. Fix anything missing.
4. **Email queue**: query `cron.job` for `process-email-queue` (must exist), check `email_send_log` last 24h for failures.
5. **Edge function health**: smoke-test `create-checkout`, `confirm-payment`, `payments-webhook`, `deliver-song`, `kie-callback` via `supabase--curl_edge_functions` against the test env.
6. **RLS**: run `supabase--linter` and `security--run_security_scan`. Fix any criticals.
7. **Generation pipeline**: create one test order end-to-end ($0 reward path) and walk through quiz → checkout → brief → Suno → callback → deliver. Confirm song lands in portal.
8. **Auth**: confirm Google OAuth still works (existing `src/routes/auth.callback.tsx`), confirm guest-order claim trigger is intact (`claim_orders_for_user`).

Each finding becomes a fix in the same loop until clean.

---

## Files touched

**Migrations**: 1 new (no schema changes — only minor: add `email_send_log` row trigger? not needed — schema already complete).

**New edge functions**: `approve-reaction`, `reject-reaction`, `redeem-reward-code`, `unlock-second-variant`, `regenerate-song`. (5 new)

**Modified edge functions**: `create-checkout`, `deliver-song`, possibly `payments-webhook`. (3)

**New email templates**: `reaction-approved.tsx`, `reaction-rejected.tsx`. Update `song-delivered.tsx` and `registry.ts`. Update `send-app-email/index.ts`. (4)

**Frontend routes**: `portal.$id.tsx` (full rewrite), `create.tsx` (reward/promo URL handling), `admin.tsx` (Reactions tab), small audit-fixes to landing/upsell pages if drift found.

**Components**: 1-2 new (RegenerationModal, ShareButtons, RewardsCard).

---

## Out of scope (will note but not build)

- Native mobile app
- Custom video processing for reactions (we accept MP4 as-is)
- Multi-language support beyond what's already there

After approval, I'll execute Wave A → B → C → D → E in that order, deploying each wave before moving to the next so failures surface early.
