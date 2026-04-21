DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;

CREATE POLICY "Create order with matching or null user_id"
  ON public.orders FOR INSERT
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );