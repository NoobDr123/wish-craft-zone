-- Promo codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_pct integer NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 100),
  max_uses integer NOT NULL DEFAULT 1,
  times_used integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_promo_codes_code ON public.promo_codes(lower(code));

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promo codes"
  ON public.promo_codes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages promo codes"
  ON public.promo_codes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Redemptions table (audit trail)
CREATE TABLE public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  order_id uuid NOT NULL,
  buyer_email text,
  discount_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, order_id)
);

CREATE INDEX idx_promo_redemptions_order ON public.promo_code_redemptions(order_id);

ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read redemptions"
  ON public.promo_code_redemptions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages redemptions"
  ON public.promo_code_redemptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add discount tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN promo_code_id uuid REFERENCES public.promo_codes(id),
  ADD COLUMN discount_cents integer NOT NULL DEFAULT 0;

-- Atomic redeem function: validates and increments usage in one shot
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  _code text,
  _order_id uuid,
  _base_amount_cents integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pc public.promo_codes;
  discount_amount integer;
  final_amount integer;
BEGIN
  -- Lock the row to prevent concurrent over-redemption
  SELECT * INTO pc
  FROM public.promo_codes
  WHERE lower(code) = lower(trim(_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  IF NOT pc.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inactive_code');
  END IF;

  IF pc.expires_at IS NOT NULL AND pc.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired_code');
  END IF;

  IF pc.times_used >= pc.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_uses_reached');
  END IF;

  -- If this order already used this code, return the existing redemption (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.promo_code_redemptions
    WHERE promo_code_id = pc.id AND order_id = _order_id
  ) THEN
    discount_amount := round(_base_amount_cents * pc.discount_pct / 100.0);
    final_amount := GREATEST(_base_amount_cents - discount_amount, 0);
    RETURN jsonb_build_object(
      'ok', true,
      'already_redeemed', true,
      'promo_code_id', pc.id,
      'discount_pct', pc.discount_pct,
      'discount_cents', discount_amount,
      'final_amount_cents', final_amount
    );
  END IF;

  discount_amount := round(_base_amount_cents * pc.discount_pct / 100.0);
  final_amount := GREATEST(_base_amount_cents - discount_amount, 0);

  -- Increment usage and record redemption atomically
  UPDATE public.promo_codes
    SET times_used = times_used + 1
    WHERE id = pc.id;

  INSERT INTO public.promo_code_redemptions (promo_code_id, order_id, discount_cents)
  VALUES (pc.id, _order_id, discount_amount);

  RETURN jsonb_build_object(
    'ok', true,
    'already_redeemed', false,
    'promo_code_id', pc.id,
    'discount_pct', pc.discount_pct,
    'discount_cents', discount_amount,
    'final_amount_cents', final_amount
  );
END;
$$;

-- Seed the TEST code: 100% off, single use
INSERT INTO public.promo_codes (code, discount_pct, max_uses, notes)
VALUES ('TEST', 100, 1, 'One-time test code — full discount for end-to-end flow validation');
