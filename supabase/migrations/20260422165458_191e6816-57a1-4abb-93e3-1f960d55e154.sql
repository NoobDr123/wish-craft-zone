-- Drop the public SELECT policy that exposed all columns; replace with column-level grants.
DROP POLICY IF EXISTS "Public read of published featured samples" ON public.featured_samples;

-- Recreate as a column-restricted policy is not possible in PG RLS, so combine
-- a row policy with column-level GRANTs on the base table.
CREATE POLICY "Public read of published featured samples"
ON public.featured_samples
FOR SELECT
TO anon, authenticated
USING (published = true);

-- Revoke broad SELECT and re-grant only safe columns to anon/authenticated.
REVOKE SELECT ON public.featured_samples FROM anon, authenticated;
GRANT SELECT (
  id, title, recipient_name, for_text, quote, cover_image_url,
  audio_url, genre_label, genre, voice, tempo, story_prompt,
  relationship, stage, lyrics, sort_order, published, created_at, updated_at
) ON public.featured_samples TO anon, authenticated;

-- The view continues to work for any client that prefers it.
GRANT SELECT ON public.public_featured_samples TO anon, authenticated;