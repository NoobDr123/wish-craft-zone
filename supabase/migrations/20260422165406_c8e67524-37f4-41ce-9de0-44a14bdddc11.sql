-- 1. MFA: revoke client direct access to mfa_verifications inserts and to sensitive user_mfa columns
DROP POLICY IF EXISTS "Users insert own mfa verifications" ON public.mfa_verifications;
-- Only service_role (edge function) may insert verifications now
CREATE POLICY "Service role inserts mfa verifications"
ON public.mfa_verifications
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

-- Lock down user_mfa: drop blanket ALL policy and replace with restricted policies
-- so clients can read their enrollment status but NOT the totp_secret/recovery_codes,
-- and clients can no longer write totp_secret or recovery_codes directly.
DROP POLICY IF EXISTS "Users manage own mfa" ON public.user_mfa;

-- Service role full access (edge function uses service role key)
CREATE POLICY "Service role manages user_mfa"
ON public.user_mfa
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Users may only read their own enrollment flag — sensitive cols excluded by application via a view
CREATE POLICY "Users read own user_mfa row"
ON public.user_mfa
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Public-safe view that excludes totp_secret and recovery_codes
CREATE OR REPLACE VIEW public.user_mfa_status
WITH (security_invoker = true)
AS SELECT user_id, enrolled, created_at, updated_at FROM public.user_mfa;
GRANT SELECT ON public.user_mfa_status TO authenticated;

-- 2. ORDERS: prevent users from changing payment / admin-only fields
CREATE OR REPLACE FUNCTION public.prevent_user_order_field_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role and admins may change anything
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Block changes to sensitive payment / pipeline / admin fields by ordinary users
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
  THEN
    RAISE EXCEPTION 'You are not allowed to modify protected order fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_user_order_field_tampering_trg ON public.orders;
CREATE TRIGGER prevent_user_order_field_tampering_trg
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_order_field_tampering();

-- 3. FEATURED_SAMPLES: expose only safe columns publicly via a view
DROP POLICY IF EXISTS "Anyone can view published featured samples" ON public.featured_samples;
-- Keep admin policies; non-admins must go through the view

CREATE OR REPLACE VIEW public.public_featured_samples
WITH (security_invoker = false)
AS SELECT
  id,
  title,
  recipient_name,
  for_text,
  quote,
  cover_image_url,
  audio_url,
  genre_label,
  genre,
  voice,
  tempo,
  story_prompt,
  relationship,
  stage,
  lyrics,
  sort_order,
  created_at,
  updated_at
FROM public.featured_samples
WHERE published = true;

GRANT SELECT ON public.public_featured_samples TO anon, authenticated;