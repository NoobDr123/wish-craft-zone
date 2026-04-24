-- Make the view bypass underlying orders RLS so public listen pages work.
-- The view itself already filters to delivered songs with a share_page_slug
-- and exposes no buyer email or payment fields.
ALTER VIEW public.public_shared_songs SET (security_invoker = false);

-- Ensure anon + authenticated can read the view
GRANT SELECT ON public.public_shared_songs TO anon, authenticated;