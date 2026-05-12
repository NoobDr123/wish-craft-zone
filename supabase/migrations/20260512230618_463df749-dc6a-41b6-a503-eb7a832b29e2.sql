ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_tier_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_tier_check
  CHECK (delivery_tier IN ('standard', 'express_48h', 'rush_24h', 'priority_90min'));