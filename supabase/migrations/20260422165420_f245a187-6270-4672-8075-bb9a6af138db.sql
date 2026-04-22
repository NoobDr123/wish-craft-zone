-- Recreate the public featured samples view with security_invoker so it
-- enforces RLS using the querying user's permissions, not the view creator.
ALTER VIEW public.public_featured_samples SET (security_invoker = true);

-- Also need a permissive SELECT policy on the base table that allows anon/authenticated
-- to read published rows (since the view now runs as the caller). We restrict to published rows only.
CREATE POLICY "Anyone can read published featured samples (base)"
ON public.featured_samples
FOR SELECT
TO anon, authenticated
USING (published = true);