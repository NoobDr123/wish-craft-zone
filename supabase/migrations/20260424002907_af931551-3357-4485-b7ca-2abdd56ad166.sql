-- Reaction reward codes — one unique code per order.
-- Customer earns it by uploading a reaction video; they can redeem it
-- for 2 free songs on a future order. Single-use to prevent abuse.

CREATE TABLE public.reaction_reward_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  buyer_email text NOT NULL,
  user_id uuid,
  code text NOT NULL UNIQUE,
  free_songs_remaining integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'locked', -- locked | unlocked | partially_redeemed | fully_redeemed | revoked
  reaction_video_id uuid,
  refund_request_id uuid,
  unlocked_at timestamptz,
  first_redeemed_at timestamptz,
  fully_redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reaction_reward_codes_buyer_email ON public.reaction_reward_codes (lower(buyer_email));
CREATE INDEX idx_reaction_reward_codes_user_id ON public.reaction_reward_codes (user_id);
CREATE INDEX idx_reaction_reward_codes_status ON public.reaction_reward_codes (status);

ALTER TABLE public.reaction_reward_codes ENABLE ROW LEVEL SECURITY;

-- Owners can view their own code (linked by user_id OR matching buyer email on JWT)
CREATE POLICY "Owners view own reward codes"
  ON public.reaction_reward_codes
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      (auth.jwt() ->> 'email') IS NOT NULL
      AND lower(buyer_email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Admins read all
CREATE POLICY "Admins read all reward codes"
  ON public.reaction_reward_codes
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins update (e.g. revoke for abuse, mark redeemed)
CREATE POLICY "Admins update reward codes"
  ON public.reaction_reward_codes
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role manages everything (used by edge functions for issuing/redeeming)
CREATE POLICY "Service role manages reward codes"
  ON public.reaction_reward_codes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- updated_at trigger
CREATE TRIGGER update_reaction_reward_codes_updated_at
  BEFORE UPDATE ON public.reaction_reward_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Code generator: creates a locked reward code as soon as an order is paid.
-- Format: RIBBON-XXXX-XXXX (uppercase alphanumeric, ambiguous chars removed).
CREATE OR REPLACE FUNCTION public.generate_reward_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  result text := 'RIBBON-';
  i int;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  result := result || '-';
  FOR i IN 1..4 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Issue a (locked) code for an order. Idempotent — returns existing code if one exists.
CREATE OR REPLACE FUNCTION public.issue_reward_code_for_order(_order_id uuid)
RETURNS public.reaction_reward_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing public.reaction_reward_codes;
  ord public.orders;
  new_code text;
  attempts int := 0;
BEGIN
  SELECT * INTO existing FROM public.reaction_reward_codes WHERE order_id = _order_id;
  IF FOUND THEN
    RETURN existing;
  END IF;

  SELECT * INTO ord FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', _order_id;
  END IF;

  -- Try up to 5 times to avoid the (extremely unlikely) collision
  LOOP
    new_code := public.generate_reward_code();
    attempts := attempts + 1;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.reaction_reward_codes WHERE code = new_code);
    IF attempts >= 5 THEN
      RAISE EXCEPTION 'Could not generate unique reward code after 5 attempts';
    END IF;
  END LOOP;

  INSERT INTO public.reaction_reward_codes (order_id, buyer_email, user_id, code)
  VALUES (_order_id, ord.buyer_email, ord.user_id, new_code)
  RETURNING * INTO existing;

  RETURN existing;
END;
$$;

-- Backfill: issue codes for all existing paid orders so the confirmation page works for them too
INSERT INTO public.reaction_reward_codes (order_id, buyer_email, user_id, code)
SELECT
  o.id,
  o.buyer_email,
  o.user_id,
  -- generate a unique code per row (best-effort — collisions extremely unlikely)
  'RIBBON-' || upper(substr(md5(random()::text || o.id::text), 1, 4)) || '-' || upper(substr(md5(random()::text || o.id::text || '2'), 1, 4))
FROM public.orders o
WHERE NOT EXISTS (SELECT 1 FROM public.reaction_reward_codes r WHERE r.order_id = o.id);