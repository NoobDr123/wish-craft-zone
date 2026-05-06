# Brand + Upsell/Downsell + Email Audit

## What's actually already in place (good news)

- **Brand name:** "PawPrint Song" used consistently across emails, header, footer.
- **Logo:** `src/assets/pawprintsong-logo.png` is used on the site **and** is already uploaded to the `email-assets` storage bucket. Both auth emails and app emails reference it via `BRAND.logoUrl`.
- **Brand tokens:** `src/lib/email-templates/_brand.ts` already centralizes colors/fonts to match the lander.
- **Auth emails (6 templates):** signup, magic-link, recovery, invite, email-change, reauthentication — all branded React Email templates.
- **App emails (7 templates):** song-delivered, order_confirmation, reaction-approved, reaction-rejected, support-notification, support-acknowledgment, support-reply — all branded inline HTML in `send-app-email`.
- **Triggers wired up:**
  - `payments-webhook` / `confirm-payment` / `mark-upsells-complete` → `order_confirmation`
  - `deliver-song` → `song-delivered`
  - `approve-reaction` / `reject-reaction` → `reaction-approved` / `reaction-rejected`
  - support flow → support emails

So the email infrastructure is already correct and on-brand. No new logo, no new template scaffolding needed.

## What I'll actually change

### 1. Upsell/Downsell copy refresh (the main work)
Rewrite copy across:
- `src/routes/upsell-1.tsx` — Extra verses upsell
- `src/routes/upsell-2.tsx` — Rush delivery upsell
- `src/routes/upsell-3.tsx` — Vinyl / keepsake upsell
- `src/components/UpsellShell.tsx` — Shared frame copy (headers, "skip" link, urgency)
- `src/components/Delivery48Downsell.tsx` — Abandoned/downsell offer
- `src/routes/checkout.tsx` — In-checkout add-on copy

Copy goals:
- Dog-first emotional framing ("for her", "her song", warm not pushy)
- Specific over generic ("a third verse with her quirks" not "more content")
- Soft urgency, no fake countdowns
- Consistent voice with the lander
- Clear "no thanks" path on every page

### 2. Email QA pass (light touch)
- Verify all 13 email templates render with the same logo + colors
- Check footer links point to `ribbonsong.com`
- Confirm `from` address `noreply@notify.ribbonsong.com` everywhere
- No new templates created (existing coverage is complete)

### 3. Customer testimonials
You wrote "customer prodtials" — I'm reading this as **customer testimonials** to refresh on the lander. The lander already pulls testimonial songs from the DB. I'll only touch the static testimonial quotes/copy on the lander, not the DB-backed ones.

## What I will NOT do (unless you say so)

- Replace the logo (you said use the lander one — already in use)
- Create new email templates (existing coverage is complete)
- Re-scaffold email infra (already set up via `setup_email_infra`)
- Change pricing or add-on logic (copy only)
- Touch the `MANUS_API.md` or public API surface

## Order of operations

1. Read all 6 upsell/downsell/checkout files to see current copy
2. Rewrite copy in each, keeping props/logic intact
3. Refresh static testimonial quotes on the lander (if any are hardcoded)
4. Quick visual sanity check via the preview
5. Brief summary back to you — then publish

---

**Confirm and I'll start.** Or tell me which parts to skip / what voice you want (e.g. more playful vs more reverent).
