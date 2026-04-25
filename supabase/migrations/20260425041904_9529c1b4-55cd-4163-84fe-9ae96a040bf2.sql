-- Replace the overly permissive "true" insert policy with one that requires
-- the order to actually exist. Listeners are still anonymous (no auth needed),
-- but they cannot insert junk rows for non-existent orders.
DROP POLICY IF EXISTS "Anyone can record a play" ON public.play_events;

CREATE POLICY "Anyone can record a play for an existing order"
ON public.play_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = play_events.order_id)
);