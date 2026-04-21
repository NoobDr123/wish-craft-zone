-- 1. Attach the existing claim_orders_for_user() function to auth.users
--    so it fires automatically on signup.
DROP TRIGGER IF EXISTS on_auth_user_created_claim_orders ON auth.users;

CREATE TRIGGER on_auth_user_created_claim_orders
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_orders_for_user();

-- 2. Helper RPC that the client can call after login to claim any
--    guest orders matching the currently authenticated user's email.
--    Uses SECURITY DEFINER so it can update orders the caller doesn't
--    yet own, but is locked down to only matching their own JWT email.
CREATE OR REPLACE FUNCTION public.claim_my_guest_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text := lower(coalesce(auth.jwt() ->> 'email', ''));
  claimed integer := 0;
BEGIN
  IF uid IS NULL OR uemail = '' THEN
    RETURN 0;
  END IF;

  WITH updated AS (
    UPDATE public.orders
       SET user_id = uid
     WHERE user_id IS NULL
       AND lower(buyer_email) = uemail
    RETURNING 1
  )
  SELECT count(*) INTO claimed FROM updated;

  RETURN claimed;
END;
$$;

-- Allow authenticated users to call it.
GRANT EXECUTE ON FUNCTION public.claim_my_guest_orders() TO authenticated;