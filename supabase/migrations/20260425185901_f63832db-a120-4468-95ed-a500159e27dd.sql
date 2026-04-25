ALTER TABLE public.orders DISABLE TRIGGER prevent_user_order_field_tampering_trg;

UPDATE public.orders
SET status = 'upsells_complete'
WHERE payment_status = 'paid'
  AND delivered_at IS NULL
  AND status = 'awaiting_upsells';

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id FROM public.orders
    WHERE payment_status = 'paid'
      AND delivered_at IS NULL
      AND status = 'upsells_complete'
      AND brief IS NULL
      AND kie_task_id IS NULL
  LOOP
    PERFORM pgmq.send('generate_brief', jsonb_build_object('orderId', rec.id));
    INSERT INTO public.job_events (order_id, event_type, payload)
    VALUES (rec.id, 'brief_enqueued', jsonb_build_object('source', 'manual_force_deliver'));
  END LOOP;
END $$;

ALTER TABLE public.orders ENABLE TRIGGER prevent_user_order_field_tampering_trg;