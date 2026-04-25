
CREATE OR REPLACE FUNCTION public.admin_force_deliver_ready_orders()
RETURNS TABLE(order_id uuid, enqueued_msg_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE
  r record;
  msg_id bigint;
BEGIN
  ALTER TABLE public.orders DISABLE TRIGGER prevent_user_order_field_tampering_trg;

  FOR r IN
    SELECT id FROM public.orders
    WHERE status = 'ready_to_deliver'
      AND delivered_at IS NULL
      AND payment_status = 'paid'
  LOOP
    UPDATE public.orders
    SET scheduled_delivery_at = now() - interval '1 minute'
    WHERE id = r.id;

    msg_id := pgmq.send('deliver_song', jsonb_build_object('orderId', r.id));
    order_id := r.id;
    enqueued_msg_id := msg_id;
    RETURN NEXT;
  END LOOP;

  ALTER TABLE public.orders ENABLE TRIGGER prevent_user_order_field_tampering_trg;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_force_deliver_ready_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_deliver_ready_orders() TO service_role;

SELECT * FROM public.admin_force_deliver_ready_orders();
