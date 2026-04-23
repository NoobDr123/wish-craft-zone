DROP POLICY IF EXISTS "Allow order creation" ON public.orders;

CREATE POLICY "Anyone can create order with matching or null user_id"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));