-- Ensure anon and authenticated roles can insert orders for guest checkout.
-- The previous INSERT policy targeted {public} role which in some configurations
-- doesn't grant proper access; recreate explicitly for anon + authenticated.

DROP POLICY IF EXISTS "Create order with matching or null user_id" ON public.orders;

CREATE POLICY "Anyone can create order with matching or null user_id"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));

-- Also ensure base table grants exist for the API roles
GRANT INSERT, SELECT, UPDATE ON public.orders TO anon, authenticated;