-- 1. Make sure the public roles actually have base-table privileges on orders.
-- RLS policies only matter once the role is also granted the base privilege.
GRANT SELECT, INSERT, UPDATE ON public.orders TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Recreate the protective triggers that previously existed on the orders table.
-- (They were detected as missing in information_schema.triggers.)

DROP TRIGGER IF EXISTS prevent_user_order_field_tampering_trg ON public.orders;
CREATE TRIGGER prevent_user_order_field_tampering_trg
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_order_field_tampering();

DROP TRIGGER IF EXISTS orders_enqueue_brief_trigger ON public.orders;
CREATE TRIGGER orders_enqueue_brief_trigger
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_brief_on_upsells_complete();

DROP TRIGGER IF EXISTS orders_updated_at_trigger ON public.orders;
CREATE TRIGGER orders_updated_at_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();