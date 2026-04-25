CREATE OR REPLACE VIEW public.public_featured_samples AS
SELECT
  id,
  title,
  recipient_name,
  for_text,
  quote,
  cover_image_url,
  audio_url,
  genre_label,
  genre,
  voice,
  tempo,
  relationship,
  lyrics,
  synced_lyrics,
  testimonial_slug,
  sort_order,
  created_at,
  updated_at
FROM public.featured_samples
WHERE published = true;

GRANT SELECT ON public.public_featured_samples TO anon, authenticated;