ALTER TABLE public.orders DISABLE TRIGGER USER;
UPDATE public.orders SET scheduled_delivery_at = now() - interval '1 minute' WHERE id IN ('3f40433a-37ae-41a0-90f1-de1273661620','22222222-2222-2222-2222-222222222222');
ALTER TABLE public.orders ENABLE TRIGGER USER;