
-- 1. Tighten orders INSERT: add BEFORE INSERT to tampering trigger and constrain INSERT policy

-- Replace tampering function to also guard INSERT
CREATE OR REPLACE FUNCTION public.prevent_user_order_field_tampering()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Hard constraints on what end-users may set on insert.
    IF NEW.status IS DISTINCT FROM 'pending_payment'
       OR NEW.payment_status IS DISTINCT FROM 'pending'
       OR NEW.amount_paid_cents <> 0
       OR NEW.delivered_at IS NOT NULL
       OR NEW.scheduled_delivery_at IS NOT NULL
       OR NEW.kie_task_id IS NOT NULL
       OR NEW.kie_submitted_at IS NOT NULL
       OR NEW.kie_callback_received_at IS NOT NULL
       OR NEW.brief IS NOT NULL
       OR NEW.brief_score IS NOT NULL
       OR NEW.audio_variants IS NOT NULL
       OR NEW.selected_variant_id IS NOT NULL
       OR NEW.auto_qc_results IS NOT NULL
       OR NEW.human_qc_reviewer IS NOT NULL
       OR NEW.human_qc_notes IS NOT NULL
       OR NEW.share_page_slug IS NOT NULL
       OR NEW.parent_order_id IS NOT NULL
       OR NEW.stripe_payment_intent_id IS NOT NULL
       OR NEW.stripe_checkout_session_id IS NOT NULL
       OR NEW.stripe_customer_id IS NOT NULL
       OR NEW.stripe_payment_method_id IS NOT NULL
       OR NEW.second_variant_unlocked_at IS NOT NULL
       OR NEW.regeneration_used_at IS NOT NULL
       OR NEW.auto_user_provisioned_at IS NOT NULL
       OR NEW.confirmation_email_sent_at IS NOT NULL
       OR NEW.flagged_for_review IS DISTINCT FROM false
       OR NEW.flag_reason IS NOT NULL
       OR NEW.revision_count <> 0
       OR NEW.source_kind IS DISTINCT FROM 'customer_initiated'
       OR NEW.source_promo_code_id IS NOT NULL
       OR NEW.source_reward_code_id IS NOT NULL
       OR NEW.promo_code_id IS NOT NULL
       OR NEW.discount_cents <> 0
    THEN
      RAISE EXCEPTION 'You are not allowed to set protected order fields on creation';
    END IF;
    RETURN NEW;
  END IF;

  -- (UPDATE branch unchanged)
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

-- Recreate trigger to fire on BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS prevent_user_order_field_tampering_trg ON public.orders;
CREATE TRIGGER prevent_user_order_field_tampering_trg
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_user_order_field_tampering();

-- 2. Tighten the "Users can claim/update their orders" UPDATE policy with a WITH CHECK
DROP POLICY IF EXISTS "Users can claim/update their orders" ON public.orders;
CREATE POLICY "Users can claim/update their orders"
ON public.orders
FOR UPDATE
USING (
  (auth.uid() = user_id)
  OR (
    user_id IS NULL
    AND (auth.jwt() ->> 'email') IS NOT NULL
    AND lower(buyer_email) = lower(auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  (auth.uid() = user_id)
  OR (
    user_id IS NULL
    AND (auth.jwt() ->> 'email') IS NOT NULL
    AND lower(buyer_email) = lower(auth.jwt() ->> 'email')
  )
);

-- 3. Restrict dog-photos uploads: authenticated only, file size + mime limits, owner-scoped path
UPDATE storage.buckets
   SET file_size_limit = 10485760, -- 10 MB
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']
 WHERE id = 'dog-photos';

DROP POLICY IF EXISTS "Anyone can upload dog photos" ON storage.objects;

CREATE POLICY "Authenticated can upload dog photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dog-photos'
);
