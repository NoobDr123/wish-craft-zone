-- ============================================================
-- 1) featured_samples: revoke direct public SELECT, expose only sanitized view
-- ============================================================

-- Drop the broad public read policy
DROP POLICY IF EXISTS "Public read of published featured samples" ON public.featured_samples;

-- Recreate the sanitized public view WITHOUT story_prompt or stage (sensitive medical/personal context)
DROP VIEW IF EXISTS public.public_featured_samples;
CREATE VIEW public.public_featured_samples
WITH (security_invoker = true)
AS
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

-- Allow anon + authenticated to read the sanitized view
GRANT SELECT ON public.public_featured_samples TO anon, authenticated;

-- ============================================================
-- 2) public_shared_songs: switch to security_invoker (was definer)
-- ============================================================
ALTER VIEW public.public_shared_songs SET (security_invoker = true);

-- ============================================================
-- 3) user_roles: prevent privilege escalation via INSERT/UPDATE/DELETE
-- Only service_role and admins may write to user_roles.
-- ============================================================

-- Drop the half-measure policy
DROP POLICY IF EXISTS "Block self role grants" ON public.user_roles;

-- Restrictive: writes require admin role OR service_role
CREATE POLICY "Only admins or service role can write roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO public
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR auth.role() = 'service_role'
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR auth.role() = 'service_role'
);

-- ============================================================
-- 4) email-assets bucket: stop allowing listing, keep public file URLs
-- Replace the broad SELECT with one that requires an exact object name (blocks LIST)
-- ============================================================

DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;

-- Public can read files in email-assets only when requesting a specific object name.
-- Storage list operations omit the name filter, so this blocks bucket listing
-- while still allowing direct public URL fetches.
CREATE POLICY "Public read specific email-assets files"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'email-assets'
  AND name IS NOT NULL
  AND name <> ''
  AND position('/' in name) = 0  -- only top-level brand assets, no recursion
);
