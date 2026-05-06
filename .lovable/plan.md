
# PawprintSong Full Rewrite — Execution Plan

Scope: drop all cancer/relationship/stage concepts, rebuild around dog loss only. No real users, so destructive migrations are safe.

---

## Phase 1 — Database migration (single SQL file)

**`orders` table:**
- Rename `recipient_name` → `dog_name`
- Add `dog_breed` (text, nullable)
- Add `dog_gender` (text, nullable, check 'she'|'he')
- Add `dog_photo_url` (text, nullable)
- Add `personality` (text), `shared_memory` already exists as concept → add new column `dog_personality` and `dog_memory` (text, nullable)
- Add `letter_to_dog` (text, nullable) — the message to her
- Drop columns: `relationship`, `recipient_relationship`, `stage` (doesn't exist on orders, only inferred), `cancer_type` (doesn't exist on orders), `fighting_for`, `qualities`, `signature_strength`, `hardest_moment`, `what_helps_most`, `inside_joke`, `little_things`, `faith_or_beliefs`, `personal_words`, `hope_for_them` — wait, most of these only live in `quiz_payload` JSON, NOT as columns. Verified: orders only has `relationship`, `recipient_relationship`, plus the standard fields. So actual column drops are minimal.
- **Update the INSERT RLS check policy** "Anyone can create pending order" — it currently lists every protected column; we must replace it to reference the new column names (no more `recipient_name` literal, etc.)
- **Update `prevent_user_order_field_tampering` trigger** — same: scrub references to dropped columns, add nothing for the new soft-text fields (they're buyer-editable like `recipient_name` was)

**`featured_samples` table** (drives landing page samples):
- Rename `recipient_name` → `dog_name`
- Add `dog_breed`, `dog_gender`, `dog_photo_url`
- Drop `relationship`, `stage`
- Add `dog_personality`, `dog_memory`, `letter_to_dog`
- Update `sync_public_featured_sample` trigger function to use new column names
- Update `public_featured_samples` materialized table — same column changes
- Update `get_public_shared_song` RPC + `sync_public_shared_song_from_order` trigger — rename `recipient_name` → `dog_name`
- Update `public_shared_songs` table — same

**Reward code prefix:**
- Replace `generate_reward_code()` function: `'RIBBON-'` → `'PAW-'`

**Data:** truncate `orders` (no real users) to avoid orphaned rows referencing dropped columns. Keep `featured_samples` intact — we'll re-seed via UPDATE to map old data to new columns where possible, then unpublish all old cancer-themed samples.

---

## Phase 2 — Backend rewrite

**`supabase/functions/_shared/claude.ts`:**
- Replace `SongBrief` interface: keep `title`, `style_prompt`, `lyrics`, `language`, `emotional_tone`
- Replace `BriefScore`: drop `tense_correctness` hard gate; add `dog_specificity` (0-5, hard gate ≥3.5) and `cliche_avoidance` (0-5, hard gate ≥3.5 — flags "rainbow bridge", "heaven", "angel", "furbaby", "memorial")
- Update PawPrint Song description in shared types

**`generate-brief/index.ts` + `generate-sample/index.ts`:**
- Rewrite Claude system prompt: "PawprintSong's senior songwriter. You write songs for dogs we've loved and lost. Tender, specific, never religious, never clinical. Use her name liberally. Present-tense the love."
- Rewrite user prompt template to read new fields: `dog_name`, `dog_breed`, `dog_gender`, `dog_personality`, `dog_memory`, `letter_to_dog` (instead of `recipient_name`, `relationship`, `stage`, `story_prompt`)
- Add brand voice rules to system prompt (the "Never" list from the md: no rainbow bridge / heaven / memorial / furbaby / cancer language)
- Update scorer prompt to include the two new dimensions

**Other edge functions:** scan & fix any reference to dropped columns:
- `kickoff-hero-sample`, `regenerate-song`, `deliver-song`, `unlock-second-variant`, `transcribe-sample`, `audioshake-align` — patch any `recipient_name` / `relationship` / `stage` references

**Stripe descriptors** in `create-checkout`, `create-payment-intent`, `charge-upsell`, `unlock-second-variant`: "PawPrint Song" → "PawprintSong" (one word).

---

## Phase 3 — Generate Daisy hero song

After backend is rewritten and deployed:
1. Insert a new row into `featured_samples` with Daisy/Golden Retriever data hardcoded from the spec
2. Mark it `published = true`, `sort_order = 0` (becomes the hero)
3. Invoke `generate-sample` edge function with the new sample ID
4. Wait for KIE callback to populate audio_url + synced_lyrics
5. Update landing page `HERO_SAMPLE_ID` constant to the new ID

Also seed the 6 "Listen first" sample cards from the md spec (Cheeto Paws, Still on the Couch, Good Girl Always, My Shadow, The Front Door, Where the Sunbeam Was) — but DON'T auto-generate audio for those; admin can do later via the existing flow. They render as silent cards with covers.

---

## Phase 4 — Frontend: zustand store + quiz copy

**`src/stores/quizStore.ts`:**
- Drop `relationship`, `relationship_other`, `stage`, `cancer_type`, all unused legacy text fields
- Add `dog_name`, `dog_breed` (string), `dog_breed_other`, `dog_gender` ('she' | 'he'), `dog_photo_url`, `dog_personality`, `dog_memory`, `letter_to_dog`
- Keep `genre`, `voice` (drop `tempo` per spec — inferred from genre)
- Keep `buyer_name`, `buyer_email`, upsell flags, reward_code
- Bump localStorage key: `ribbonsong-quiz-v3` → `pawprintsong-quiz-v1`

**`src/lib/quizCopy.ts`:**
- Delete entire RibbonSong relationship/stage register system
- Replace with: `breedFamily(breed)` → returns one of `lab|husky|guard|small|hound|herding|bulldog|big|mixed`
- `personalityPlaceholder(family)` + `personalityChips(family)` from the md breed matrix
- `memoryPlaceholder()` (single default), `memoryChips()` (5 fixed chips)
- `letterPlaceholder(dogName, gender)`, `letterChips()` (5 fixed chips)

**`src/routes/create.tsx`:** rebuild as 7-step linear flow, no journey branching.

---

## Phase 5 — Frontend: pages

In order:
1. `src/routes/index.tsx` — gut & rewrite per md sections 1.0-1.10. Hero → Daisy. Press strip → pet outlets. How it works → 3 steps. Listen first → samples grid. Who it's for → 8-card grid (soul dog / goofy / senior / rescue / lost too soon / childhood / anniversary / friend). 24 testimonials. Guarantee. FAQ. Final CTA. Footer.
2. `src/routes/almost-there.tsx` — replace headline with "You're moments away from {dog_name}'s song", swap testimonials.
3. `src/routes/upsell-1.tsx`, `upsell-2.tsx`, `upsell-3.tsx` — copy swap per md sections 5–7.
4. `src/components/Delivery48Downsell.tsx` — copy swap per section 6b.
5. `src/routes/processing.tsx` — copy swap, dog-aware order summary.
6. `src/routes/checkout.tsx`, account.tsx, scratch.tsx, contact.tsx — minor copy swaps where cancer language appears.

**Components:**
- `SiteHeader.tsx` nav: Listen · Who it's for · How it works · Stories · FAQ
- `SiteFooter.tsx` columns per md section 1.10
- `CheckoutSamples.tsx` — uses dog_name/dog_breed
- `OrderPortal.tsx` — uses dog_name

**Assets:** delete or rename references to `who-newly-diagnosed.png` / `who-in-treatment.png` / etc. Generate 8 new dog-themed images via imagegen for the "Who it's for" grid (or use a single hero illustration + repeat).

---

## Phase 6 — Emails

`src/lib/email-templates/song-delivered.tsx` — rewrite copy for dog tone: "We made {dog_name}'s song", subject "{dog_name}'s song is ready 🐾", drop cancer framing.

---

## Phase 7 — Verify & ship

- Run typecheck (auto by harness)
- Read `/`, `/create`, `/upsell-1`, `/processing` console logs
- Confirm Daisy hero loads
- Confirm quiz step 1 → 7 walks cleanly
- Confirm checkout creates an `orders` row with new columns

---

## Risks / call-outs

- **Admin panel** (`src/routes/admin.tsx`) almost certainly references `relationship` / `recipient_name`. I'll patch it to read new column names but NOT redesign it. Same for `account.tsx`, `portal.$id.tsx`, `listen.$id.tsx`.
- **Remotion** (`remotion/src/SongVideo.tsx` + `Branding.tsx` + `schema.ts`) — already says "PawPrint Song"; small copy pass to "PawprintSong".
- **Hero image** (`hero-ribbon.jpg`) — keep filename to avoid breaking imports; visually it's been replaced via earlier brand pass. We'll generate a new dog hero photo and swap.
- **Time:** roughly 25–35 tool calls. Migration first (must approve), then I work straight through phases 2–7.
