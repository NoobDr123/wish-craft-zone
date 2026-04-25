-- ========================================
-- Phase 1: Portal rebuild — schema changes
-- ========================================

-- 1) Orders: track 2nd-variant unlock + regeneration use + parent linkage already exists
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS second_variant_unlocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS regeneration_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'paid',
  -- 'paid' | 'free_reward' | 'regeneration' | 'discounted_returning'
  ADD COLUMN IF NOT EXISTS source_promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_reward_code_id uuid REFERENCES public.reaction_reward_codes(id) ON DELETE SET NULL;

-- 2) promo_codes: add kind + ownership (so a free-song code only works for THE customer it was issued to)
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'generic',
  -- 'generic' | 'free_song' | 'returning_10pct'
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS issued_for_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS issued_for_reward_code_id uuid REFERENCES public.reaction_reward_codes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_promo_codes_owner_user_id ON public.promo_codes(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_owner_email ON public.promo_codes(lower(owner_email));
CREATE INDEX IF NOT EXISTS idx_promo_codes_kind ON public.promo_codes(kind);

-- 3) reaction_reward_codes: track admin approval + refund metadata
ALTER TABLE public.reaction_reward_codes
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_stripe_id text,
  ADD COLUMN IF NOT EXISTS refund_amount_cents integer,
  ADD COLUMN IF NOT EXISTS refund_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 4) Allow buyers to read their own promo codes (so the portal can display them)
DROP POLICY IF EXISTS "Owners view own promo codes" ON public.promo_codes;
CREATE POLICY "Owners view own promo codes"
  ON public.promo_codes
  FOR SELECT
  TO public
  USING (
    (owner_user_id IS NOT NULL AND owner_user_id = auth.uid())
    OR (
      owner_email IS NOT NULL
      AND (auth.jwt() ->> 'email') IS NOT NULL
      AND lower(owner_email) = lower(auth.jwt() ->> 'email')
    )
  );

-- 5) Tighten the order-tampering trigger so the new columns are protected
CREATE OR REPLACE FUNCTION public.prevent_user_order_field_tampering()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Allow the auto-claim path (NULL user_id getting set, no other changes).
  IF OLD.user_id IS NULL
     AND NEW.user_id IS NOT NULL
     AND NEW.amount_cents IS NOT DISTINCT FROM OLD.amount_cents
     AND NEW.amount_paid_cents IS NOT DISTINCT FROM OLD.amount_paid_cents
     AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status
     AND NEW.stripe_payment_intent_id IS NOT DISTINCT FROM OLD.stripe_payment_intent_id
     AND NEW.stripe_customer_id IS NOT DISTINCT FROM OLD.stripe_customer_id
     AND NEW.stripe_payment_method_id IS NOT DISTINCT FROM OLD.stripe_payment_method_id
     AND NEW.stripe_checkout_session_id IS NOT DISTINCT FROM OLD.stripe_checkout_session_id
     AND NEW.product_config IS NOT DISTINCT FROM OLD.product_config
     AND NEW.priority IS NOT DISTINCT FROM OLD.priority
     AND NEW.flagged_for_review IS NOT DISTINCT FROM OLD.flagged_for_review
     AND NEW.flag_reason IS NOT DISTINCT FROM OLD.flag_reason
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.brief IS NOT DISTINCT FROM OLD.brief
     AND NEW.brief_score IS NOT DISTINCT FROM OLD.brief_score
     AND NEW.kie_task_id IS NOT DISTINCT FROM OLD.kie_task_id
     AND NEW.parent_order_id IS NOT DISTINCT FROM OLD.parent_order_id
     AND NEW.delivery_tier IS NOT DISTINCT FROM OLD.delivery_tier
     AND NEW.stripe_env IS NOT DISTINCT FROM OLD.stripe_env
     AND NEW.stripe_fulfillment_synced_at IS NOT DISTINCT FROM OLD.stripe_fulfillment_synced_at
     AND NEW.second_variant_unlocked_at IS NOT DISTINCT FROM OLD.second_variant_unlocked_at
     AND NEW.regeneration_used_at IS NOT DISTINCT FROM OLD.regeneration_used_at
     AND NEW.source_kind IS NOT DISTINCT FROM OLD.source_kind
     AND NEW.source_promo_code_id IS NOT DISTINCT FROM OLD.source_promo_code_id
     AND NEW.source_reward_code_id IS NOT DISTINCT FROM OLD.source_reward_code_id
  THEN
    RETURN NEW;
  END IF;

  -- Allow buyer to set selected_variant_id only (player UX).
  IF NEW.selected_variant_id IS DISTINCT FROM OLD.selected_variant_id
     AND NEW.amount_cents IS NOT DISTINCT FROM OLD.amount_cents
     AND NEW.amount_paid_cents IS NOT DISTINCT FROM OLD.amount_paid_cents
     AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status
     AND NEW.stripe_payment_intent_id IS NOT DISTINCT FROM OLD.stripe_payment_intent_id
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.brief IS NOT DISTINCT FROM OLD.brief
     AND NEW.audio_variants IS NOT DISTINCT FROM OLD.audio_variants
     AND NEW.delivery_tier IS NOT DISTINCT FROM OLD.delivery_tier
     AND NEW.second_variant_unlocked_at IS NOT DISTINCT FROM OLD.second_variant_unlocked_at
     AND NEW.regeneration_used_at IS NOT DISTINCT FROM OLD.regeneration_used_at
     AND NEW.source_kind IS NOT DISTINCT FROM OLD.source_kind
  THEN
    RETURN NEW;
  END IF;

  IF NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
     OR NEW.amount_paid_cents IS DISTINCT FROM OLD.amount_paid_cents
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_payment_method_id IS DISTINCT FROM OLD.stripe_payment_method_id
     OR NEW.stripe_checkout_session_id IS DISTINCT FROM OLD.stripe_checkout_session_id
     OR NEW.product_config IS DISTINCT FROM OLD.product_config
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.flagged_for_review IS DISTINCT FROM OLD.flagged_for_review
     OR NEW.flag_reason IS DISTINCT FROM OLD.flag_reason
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.brief IS DISTINCT FROM OLD.brief
     OR NEW.brief_score IS DISTINCT FROM OLD.brief_score
     OR NEW.kie_task_id IS DISTINCT FROM OLD.kie_task_id
     OR NEW.kie_submitted_at IS DISTINCT FROM OLD.kie_submitted_at
     OR NEW.kie_callback_received_at IS DISTINCT FROM OLD.kie_callback_received_at
     OR NEW.audio_variants IS DISTINCT FROM OLD.audio_variants
     OR NEW.auto_qc_results IS DISTINCT FROM OLD.auto_qc_results
     OR NEW.human_qc_reviewer IS DISTINCT FROM OLD.human_qc_reviewer
     OR NEW.human_qc_notes IS DISTINCT FROM OLD.human_qc_notes
     OR NEW.share_page_slug IS DISTINCT FROM OLD.share_page_slug
     OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
     OR NEW.scheduled_delivery_at IS DISTINCT FROM OLD.scheduled_delivery_at
     OR NEW.is_rush IS DISTINCT FROM OLD.is_rush
     OR NEW.has_3rd_verse IS DISTINCT FROM OLD.has_3rd_verse
     OR NEW.has_unlimited_edits IS DISTINCT FROM OLD.has_unlimited_edits
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.parent_order_id IS DISTINCT FROM OLD.parent_order_id
     OR NEW.revision_count IS DISTINCT FROM OLD.revision_count
     OR NEW.delivery_tier IS DISTINCT FROM OLD.delivery_tier
     OR NEW.stripe_env IS DISTINCT FROM OLD.stripe_env
     OR NEW.stripe_fulfillment_synced_at IS DISTINCT FROM OLD.stripe_fulfillment_synced_at
     OR NEW.second_variant_unlocked_at IS DISTINCT FROM OLD.second_variant_unlocked_at
     OR NEW.regeneration_used_at IS DISTINCT FROM OLD.regeneration_used_at
     OR NEW.source_kind IS DISTINCT FROM OLD.source_kind
     OR NEW.source_promo_code_id IS DISTINCT FROM OLD.source_promo_code_id
     OR NEW.source_reward_code_id IS DISTINCT FROM OLD.source_reward_code_id
  THEN
    RAISE EXCEPTION 'You are not allowed to modify protected order fields';
  END IF;

  RETURN NEW;
END;
$function$;

-- 6) RPC: Issue a unique single-use code (used by edge functions; SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.issue_personal_promo_code(
  _kind text,
  _discount_pct integer,
  _owner_user_id uuid,
  _owner_email text,
  _issued_for_order_id uuid DEFAULT NULL,
  _issued_for_reward_code_id uuid DEFAULT NULL,
  _expires_in_days integer DEFAULT 90
)
RETURNS public.promo_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  prefix text;
  new_code text;
  attempts int := 0;
  inserted public.promo_codes;
  i int;
BEGIN
  IF _kind NOT IN ('free_song', 'returning_10pct', 'generic') THEN
    RAISE EXCEPTION 'Invalid kind: %', _kind;
  END IF;

  prefix := CASE _kind
    WHEN 'free_song' THEN 'FREE'
    WHEN 'returning_10pct' THEN 'WELCOME'
    ELSE 'CODE'
  END;

  LOOP
    new_code := prefix || '-';
    FOR i IN 1..4 LOOP
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    new_code := new_code || '-';
    FOR i IN 1..4 LOOP
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    attempts := attempts + 1;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.promo_codes WHERE code = new_code);
    IF attempts >= 8 THEN
      RAISE EXCEPTION 'Could not generate unique code after 8 attempts';
    END IF;
  END LOOP;

  INSERT INTO public.promo_codes (
    code, discount_pct, max_uses, times_used, active, expires_at,
    kind, owner_user_id, owner_email, issued_for_order_id, issued_for_reward_code_id
  )
  VALUES (
    new_code, _discount_pct, 1, 0, true,
    CASE WHEN _expires_in_days > 0 THEN now() + (_expires_in_days || ' days')::interval ELSE NULL END,
    _kind, _owner_user_id, lower(_owner_email), _issued_for_order_id, _issued_for_reward_code_id
  )
  RETURNING * INTO inserted;

  RETURN inserted;
END;
$$;

-- 7) Update redeem_promo_code to enforce ownership for personal codes
CREATE OR REPLACE FUNCTION public.redeem_promo_code(_code text, _order_id uuid, _base_amount_cents integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pc public.promo_codes;
  ord public.orders;
  discount_amount integer;
  final_amount integer;
BEGIN
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

  -- Ownership check for personal codes
  IF pc.kind IN ('free_song', 'returning_10pct') THEN
    SELECT * INTO ord FROM public.orders WHERE id = _order_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
    END IF;
    IF pc.owner_user_id IS NOT NULL THEN
      IF ord.user_id IS NULL OR ord.user_id <> pc.owner_user_id THEN
        RETURN jsonb_build_object('ok', false, 'error', 'code_not_yours');
      END IF;
    ELSIF pc.owner_email IS NOT NULL THEN
      IF lower(coalesce(ord.buyer_email, '')) <> lower(pc.owner_email) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'code_not_yours');
      END IF;
    END IF;
  END IF;

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
      'kind', pc.kind,
      'discount_pct', pc.discount_pct,
      'discount_cents', discount_amount,
      'final_amount_cents', final_amount
    );
  END IF;

  discount_amount := round(_base_amount_cents * pc.discount_pct / 100.0);
  final_amount := GREATEST(_base_amount_cents - discount_amount, 0);

  UPDATE public.promo_codes
    SET times_used = times_used + 1
    WHERE id = pc.id;

  INSERT INTO public.promo_code_redemptions (promo_code_id, order_id, discount_cents)
  VALUES (pc.id, _order_id, discount_amount);

  RETURN jsonb_build_object(
    'ok', true,
    'already_redeemed', false,
    'promo_code_id', pc.id,
    'kind', pc.kind,
    'discount_pct', pc.discount_pct,
    'discount_cents', discount_amount,
    'final_amount_cents', final_amount
  );
END;
$function$;