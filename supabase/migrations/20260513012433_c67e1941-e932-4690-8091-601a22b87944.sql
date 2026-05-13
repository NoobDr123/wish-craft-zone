ALTER TABLE public.orders DISABLE TRIGGER USER;
UPDATE public.orders
SET flagged_for_review = false,
    flag_reason = NULL
WHERE flag_reason = 'KIE returned no audio URL'
  AND audio_variants IS NOT NULL
  AND jsonb_array_length(audio_variants) > 0;
ALTER TABLE public.orders ENABLE TRIGGER USER;