-- ============================================
-- 1. Extend orders table with pipeline fields
-- ============================================

-- Status lifecycle (text + check constraint kept loose for flexibility)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS brief jsonb,
  ADD COLUMN IF NOT EXISTS kie_task_id text,
  ADD COLUMN IF NOT EXISTS audio_variants jsonb,
  ADD COLUMN IF NOT EXISTS selected_variant_id text,
  ADD COLUMN IF NOT EXISTS auto_qc_results jsonb,
  ADD COLUMN IF NOT EXISTS human_qc_reviewer text,
  ADD COLUMN IF NOT EXISTS human_qc_notes text,
  ADD COLUMN IF NOT EXISTS share_page_slug text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revision_notes text;

-- Update default status to 'received' going forward (existing 'paid' rows keep their value)
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'received';

-- Unique constraint on share slug (nullable, enforced when set)
CREATE UNIQUE INDEX IF NOT EXISTS orders_share_slug_unique
  ON public.orders (share_page_slug)
  WHERE share_page_slug IS NOT NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_priority_idx ON public.orders (priority);
CREATE INDEX IF NOT EXISTS orders_kie_task_id_idx ON public.orders (kie_task_id);

-- Public read access for delivered songs via share slug
CREATE POLICY "Anyone can view delivered song by share slug"
  ON public.orders
  FOR SELECT
  USING (
    share_page_slug IS NOT NULL
    AND status = 'delivered'
  );

-- ============================================
-- 2. job_events table (audit log)
-- ============================================
CREATE TABLE IF NOT EXISTS public.job_events (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_events_order_id_idx ON public.job_events (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS job_events_event_type_idx ON public.job_events (event_type);

ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

-- Order owner can read their own job events
CREATE POLICY "Owners can read their job events"
  ON public.job_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = job_events.order_id
        AND (
          o.user_id = auth.uid()
          OR (
            o.user_id IS NULL
            AND (auth.jwt() ->> 'email') IS NOT NULL
            AND lower(o.buyer_email) = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

-- No INSERT/UPDATE/DELETE policies = only service role (server) can write events.
