DROP VIEW IF EXISTS public.public_shared_songs;

CREATE TABLE IF NOT EXISTS public.public_shared_songs (
  id uuid PRIMARY KEY,
  recipient_name text,
  audio_variants jsonb,
  selected_variant_id text,
  brief jsonb,
  genre text,
  tempo text,
  voice text,
  delivered_at timestamp with time zone,
  share_page_slug text UNIQUE,
  song_title_idea text
);

ALTER TABLE public.public_shared_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public shared songs" ON public.public_shared_songs;
CREATE POLICY "Anyone can view public shared songs"
ON public.public_shared_songs
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Service role manages public shared songs" ON public.public_shared_songs;
CREATE POLICY "Service role manages public shared songs"
ON public.public_shared_songs
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.sync_public_shared_song_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_shared_songs WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.status = 'delivered'
     AND NEW.delivered_at IS NOT NULL
     AND NEW.share_page_slug IS NOT NULL THEN
    INSERT INTO public.public_shared_songs (
      id,
      recipient_name,
      audio_variants,
      selected_variant_id,
      brief,
      genre,
      tempo,
      voice,
      delivered_at,
      share_page_slug,
      song_title_idea
    ) VALUES (
      NEW.id,
      NEW.recipient_name,
      NEW.audio_variants,
      NEW.selected_variant_id,
      NEW.brief,
      NEW.genre,
      NEW.tempo,
      NEW.voice,
      NEW.delivered_at,
      NEW.share_page_slug,
      NEW.song_title_idea
    )
    ON CONFLICT (id) DO UPDATE SET
      recipient_name = EXCLUDED.recipient_name,
      audio_variants = EXCLUDED.audio_variants,
      selected_variant_id = EXCLUDED.selected_variant_id,
      brief = EXCLUDED.brief,
      genre = EXCLUDED.genre,
      tempo = EXCLUDED.tempo,
      voice = EXCLUDED.voice,
      delivered_at = EXCLUDED.delivered_at,
      share_page_slug = EXCLUDED.share_page_slug,
      song_title_idea = EXCLUDED.song_title_idea;
  ELSE
    DELETE FROM public.public_shared_songs WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_public_shared_song_from_order_trg ON public.orders;
CREATE TRIGGER sync_public_shared_song_from_order_trg
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_public_shared_song_from_order();

INSERT INTO public.public_shared_songs (
  id,
  recipient_name,
  audio_variants,
  selected_variant_id,
  brief,
  genre,
  tempo,
  voice,
  delivered_at,
  share_page_slug,
  song_title_idea
)
SELECT
  id,
  recipient_name,
  audio_variants,
  selected_variant_id,
  brief,
  genre,
  tempo,
  voice,
  delivered_at,
  share_page_slug,
  song_title_idea
FROM public.orders
WHERE status = 'delivered'
  AND delivered_at IS NOT NULL
  AND share_page_slug IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  recipient_name = EXCLUDED.recipient_name,
  audio_variants = EXCLUDED.audio_variants,
  selected_variant_id = EXCLUDED.selected_variant_id,
  brief = EXCLUDED.brief,
  genre = EXCLUDED.genre,
  tempo = EXCLUDED.tempo,
  voice = EXCLUDED.voice,
  delivered_at = EXCLUDED.delivered_at,
  share_page_slug = EXCLUDED.share_page_slug,
  song_title_idea = EXCLUDED.song_title_idea;

GRANT SELECT ON public.public_shared_songs TO anon, authenticated;