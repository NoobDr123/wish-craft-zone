CREATE OR REPLACE FUNCTION public.prevent_user_order_field_tampering()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Service role and admins may change anything
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Allow the auto-claim flow: linking an unclaimed order (user_id IS NULL)
  -- to the freshly signed-up user. No other field may change in this case.
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
  THEN
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
$function$;