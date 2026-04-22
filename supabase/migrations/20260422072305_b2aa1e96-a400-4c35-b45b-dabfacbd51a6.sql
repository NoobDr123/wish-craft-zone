
-- 1. Remove the over-permissive public share policy on orders
DROP POLICY IF EXISTS "Anyone can view delivered song by share slug" ON public.orders;

-- 2. Create a safe view exposing ONLY the fields needed to display a delivered song publicly
CREATE OR REPLACE VIEW public.public_shared_songs
WITH (security_invoker = true) AS
SELECT
  id,
  share_page_slug,
  recipient_name,
  song_title_idea,
  genre,
  tempo,
  voice,
  audio_variants,
  selected_variant_id,
  brief,
  delivered_at
FROM public.orders
WHERE share_page_slug IS NOT NULL
  AND status = 'delivered';

GRANT SELECT ON public.public_shared_songs TO anon, authenticated;

-- 3. Add explicit RLS policies for kie_callbacks (service-role only)
CREATE POLICY "Service role manages kie_callbacks"
ON public.kie_callbacks
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins read kie_callbacks"
ON public.kie_callbacks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. Add explicit RLS policies for stripe_events (service-role only)
CREATE POLICY "Service role manages stripe_events"
ON public.stripe_events
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 5. Update default order price to $69.99
ALTER TABLE public.orders ALTER COLUMN amount_cents SET DEFAULT 6999;
