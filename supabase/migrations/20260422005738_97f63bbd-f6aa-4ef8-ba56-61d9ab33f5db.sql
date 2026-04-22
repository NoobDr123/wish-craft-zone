-- ============================================
-- 1. Enable pgmq extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- 2. Add missing columns to orders table
-- ============================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS recipient_relationship text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS amount_paid_cents int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_config jsonb NOT NULL DEFAULT '{"extra_verse": false, "rush_delivery": false, "unlimited_edits": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS kie_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS kie_callback_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS brief_score jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_delivery_at timestamptz,
  ADD COLUMN IF NOT EXISTS flagged_for_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text;

-- Unique constraint on stripe_payment_intent_id
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_pi_unique
  ON public.orders (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_scheduled_delivery_idx
  ON public.orders (scheduled_delivery_at)
  WHERE delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS orders_kie_submitted_idx
  ON public.orders (kie_submitted_at)
  WHERE status = 'audio_pending' AND kie_callback_received_at IS NULL;

CREATE INDEX IF NOT EXISTS orders_flagged_idx
  ON public.orders (flagged_for_review)
  WHERE flagged_for_review = true;

-- ============================================
-- 3. Stripe webhook idempotency
-- ============================================
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  event_type text,
  processed boolean NOT NULL DEFAULT false,
  payload jsonb
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies = service role only

-- ============================================
-- 4. Kie callbacks buffer
-- ============================================
CREATE TABLE IF NOT EXISTS public.kie_callbacks (
  id bigserial PRIMARY KEY,
  task_id text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  stage text NOT NULL, -- 'text' | 'first' | 'complete'
  received_at timestamptz NOT NULL DEFAULT now(),
  processed boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS kie_callbacks_unprocessed_idx
  ON public.kie_callbacks (processed, received_at)
  WHERE processed = false;

CREATE INDEX IF NOT EXISTS kie_callbacks_order_idx
  ON public.kie_callbacks (order_id, received_at DESC);

ALTER TABLE public.kie_callbacks ENABLE ROW LEVEL SECURITY;
-- No policies = service role only

-- ============================================
-- 5. Create pgmq queues
-- ============================================
SELECT pgmq.create('generate_brief');
SELECT pgmq.create('submit_to_kie');
SELECT pgmq.create('process_kie_callback');
SELECT pgmq.create('run_audio_qc');
SELECT pgmq.create('schedule_delivery');
SELECT pgmq.create('send_delivery');
SELECT pgmq.create('dead_letter');

-- ============================================
-- 6. Trigger: enqueue brief generation when order completes upsells
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_brief_on_upsells_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  IF NEW.status = 'upsells_complete' AND (OLD.status IS NULL OR OLD.status <> 'upsells_complete') THEN
    PERFORM pgmq.send('generate_brief', jsonb_build_object('orderId', NEW.id));
    INSERT INTO public.job_events (order_id, event_type, payload)
    VALUES (NEW.id, 'brief_enqueued', jsonb_build_object('source', 'upsells_complete_trigger'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_enqueue_brief_trigger ON public.orders;
CREATE TRIGGER orders_enqueue_brief_trigger
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_brief_on_upsells_complete();

-- ============================================
-- 7. Trigger: enqueue callback processing when Kie callback arrives
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_kie_callback_processing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  PERFORM pgmq.send(
    'process_kie_callback',
    jsonb_build_object('orderId', NEW.order_id, 'taskId', NEW.task_id, 'callbackId', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kie_callbacks_enqueue_trigger ON public.kie_callbacks;
CREATE TRIGGER kie_callbacks_enqueue_trigger
  AFTER INSERT ON public.kie_callbacks
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_kie_callback_processing();

-- ============================================
-- 8. Updated_at trigger on orders (only if not already present)
-- ============================================
DROP TRIGGER IF EXISTS orders_updated_at_trigger ON public.orders;
CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();