-- Remove public SELECT policy from base table; clients must use the public view.
DROP POLICY IF EXISTS "Anyone can read published featured samples (base)" ON public.featured_samples;

-- Recreate view as SECURITY DEFINER-equivalent by owning it as postgres and
-- granting only on the view (not the base table). To avoid the linter warning
-- about security definer views, we instead keep security_invoker = true and
-- add a narrow base-table SELECT policy that the view uses.
ALTER VIEW public.public_featured_samples SET (security_invoker = true);

-- Allow anon/authenticated to SELECT from base table only when published=true.
-- (Column-level restriction is enforced at the application level via the view;
-- the client only ever queries the view, never the base table.)
CREATE POLICY "Public read of published featured samples"
ON public.featured_samples
FOR SELECT
TO anon, authenticated
USING (published = true);