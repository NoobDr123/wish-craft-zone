-- Deactivate the old TEST promo code (90% off) so it can no longer be used
UPDATE public.promo_codes
SET active = false,
    notes = COALESCE(notes, '') || ' [DEPRECATED ' || now()::text || ' — replaced by T3ST]'
WHERE code = 'TEST';

-- Insert the new T3ST end-to-end test code.
-- The discount_pct here is a placeholder — the apply-promo-code edge function
-- recognizes T3ST and overrides the final amount to a flat $5.00 (500 cents),
-- then auto-adds every upsell, sets the order to rush priority, and advances
-- the status to upsells_complete so the song production fires immediately
-- after payment confirmation.
INSERT INTO public.promo_codes (code, discount_pct, kind, max_uses, active, notes)
VALUES ('T3ST', 90, 'generic', 9999, true,
        'End-to-end test code: charges flat $5, auto-adds all upsells, fast-tracks delivery. Special-cased in apply-promo-code edge function.')
ON CONFLICT (code) DO UPDATE
  SET active = true,
      max_uses = 9999,
      notes = EXCLUDED.notes;