
CREATE POLICY "Public can view delivered shared songs"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (
  status = 'delivered'
  AND share_page_slug IS NOT NULL
);
