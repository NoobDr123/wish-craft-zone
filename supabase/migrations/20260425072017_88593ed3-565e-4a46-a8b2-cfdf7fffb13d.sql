DROP VIEW IF EXISTS public.public_featured_samples;

CREATE TABLE IF NOT EXISTS public.public_featured_samples (
  id uuid PRIMARY KEY,
  title text,
  recipient_name text,
  for_text text,
  quote text,
  cover_image_url text,
  audio_url text,
  genre_label text,
  genre text,
  voice text,
  tempo text,
  relationship text,
  lyrics text,
  synced_lyrics jsonb,
  testimonial_slug text,
  sort_order integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

ALTER TABLE public.public_featured_samples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public featured samples" ON public.public_featured_samples;
CREATE POLICY "Anyone can view public featured samples"
ON public.public_featured_samples
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Service role manages public featured samples" ON public.public_featured_samples;
CREATE POLICY "Service role manages public featured samples"
ON public.public_featured_samples
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_public_featured_samples_sort_order
ON public.public_featured_samples (sort_order);

CREATE INDEX IF NOT EXISTS idx_public_featured_samples_testimonial_slug
ON public.public_featured_samples (testimonial_slug);

CREATE OR REPLACE FUNCTION public.sync_public_featured_sample()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_row public.featured_samples;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_featured_samples WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  source_row := NEW;

  IF source_row.published IS TRUE THEN
    INSERT INTO public.public_featured_samples (
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
    ) VALUES (
      source_row.id,
      source_row.title,
      source_row.recipient_name,
      source_row.for_text,
      source_row.quote,
      source_row.cover_image_url,
      source_row.audio_url,
      source_row.genre_label,
      source_row.genre,
      source_row.voice,
      source_row.tempo,
      source_row.relationship,
      source_row.lyrics,
      source_row.synced_lyrics,
      source_row.testimonial_slug,
      source_row.sort_order,
      source_row.created_at,
      source_row.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      recipient_name = EXCLUDED.recipient_name,
      for_text = EXCLUDED.for_text,
      quote = EXCLUDED.quote,
      cover_image_url = EXCLUDED.cover_image_url,
      audio_url = EXCLUDED.audio_url,
      genre_label = EXCLUDED.genre_label,
      genre = EXCLUDED.genre,
      voice = EXCLUDED.voice,
      tempo = EXCLUDED.tempo,
      relationship = EXCLUDED.relationship,
      lyrics = EXCLUDED.lyrics,
      synced_lyrics = EXCLUDED.synced_lyrics,
      testimonial_slug = EXCLUDED.testimonial_slug,
      sort_order = EXCLUDED.sort_order,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at;
  ELSE
    DELETE FROM public.public_featured_samples WHERE id = source_row.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_public_featured_sample_trigger ON public.featured_samples;
CREATE TRIGGER sync_public_featured_sample_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.featured_samples
FOR EACH ROW
EXECUTE FUNCTION public.sync_public_featured_sample();

TRUNCATE public.public_featured_samples;

INSERT INTO public.public_featured_samples (
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
)
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