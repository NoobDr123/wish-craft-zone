CREATE OR REPLACE FUNCTION public.get_public_shared_song(_id text)
RETURNS TABLE (
  id uuid,
  recipient_name text,
  audio_variants jsonb,
  selected_variant_id text,
  brief jsonb,
  genre text,
  tempo text,
  share_page_slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.recipient_name,
    o.audio_variants,
    o.selected_variant_id,
    o.brief,
    o.genre,
    o.tempo,
    o.share_page_slug
  FROM public.orders o
  WHERE o.status = 'delivered'
    AND o.delivered_at IS NOT NULL
    AND o.share_page_slug IS NOT NULL
    AND (o.share_page_slug = _id OR o.id::text = _id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_shared_song(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shared_song(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view delivered shared songs" ON public.orders;