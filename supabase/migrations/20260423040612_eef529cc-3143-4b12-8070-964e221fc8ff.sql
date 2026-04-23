DROP POLICY IF EXISTS "Anyone can create order with matching or null user_id" ON public.orders;

CREATE POLICY "Allow order creation"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);