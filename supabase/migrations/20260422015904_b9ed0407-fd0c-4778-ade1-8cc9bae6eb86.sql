
-- =========================
-- USER ROLES (admin gating)
-- =========================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================
-- ADMIN can read all orders + job_events
-- =========================
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders"
ON public.orders FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all job_events" ON public.job_events;
CREATE POLICY "Admins can view all job_events"
ON public.job_events FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- PGMQ queues for the pipeline
-- =========================
CREATE EXTENSION IF NOT EXISTS pgmq;

DO $$ BEGIN PERFORM pgmq.create('generate_brief'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('submit_to_kie'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('process_kie_callback'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('deliver_song'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =========================
-- pg_cron + pg_net for queue drainers and scheduled delivery
-- =========================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule old jobs if they exist (safe re-run)
DO $$
DECLARE jid bigint;
BEGIN
  FOR jid IN SELECT jobid FROM cron.job WHERE jobname IN (
    'drain-generate-brief',
    'drain-submit-to-kie',
    'drain-process-kie-callback',
    'drain-deliver-song',
    'enqueue-due-deliveries'
  ) LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
END $$;

-- Drain generate_brief queue every minute
SELECT cron.schedule(
  'drain-generate-brief',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tytxdnftsnspejnyfbmg.supabase.co/functions/v1/drain-queue',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object('queue','generate_brief','target','generate-brief','batch',5)
  );
  $$
);

SELECT cron.schedule(
  'drain-submit-to-kie',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tytxdnftsnspejnyfbmg.supabase.co/functions/v1/drain-queue',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object('queue','submit_to_kie','target','submit-to-kie','batch',5)
  );
  $$
);

SELECT cron.schedule(
  'drain-process-kie-callback',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tytxdnftsnspejnyfbmg.supabase.co/functions/v1/drain-queue',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object('queue','process_kie_callback','target','process-kie-callback','batch',10)
  );
  $$
);

SELECT cron.schedule(
  'drain-deliver-song',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tytxdnftsnspejnyfbmg.supabase.co/functions/v1/drain-queue',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object('queue','deliver_song','target','deliver-song','batch',10)
  );
  $$
);

-- Every 5 min: enqueue any orders whose scheduled_delivery_at has passed
-- and that are ready_to_deliver but not yet delivered.
SELECT cron.schedule(
  'enqueue-due-deliveries',
  '*/5 * * * *',
  $$
  SELECT public.enqueue_due_deliveries();
  $$
);

-- Helper to find orders due for delivery and push them to deliver_song
CREATE OR REPLACE FUNCTION public.enqueue_due_deliveries()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE
  rec RECORD;
  count_pushed INT := 0;
BEGIN
  FOR rec IN
    SELECT id FROM public.orders
    WHERE status = 'ready_to_deliver'
      AND delivered_at IS NULL
      AND (scheduled_delivery_at IS NULL OR scheduled_delivery_at <= now())
    LIMIT 50
  LOOP
    PERFORM pgmq.send('deliver_song', jsonb_build_object('orderId', rec.id));
    INSERT INTO public.job_events(order_id, event_type, payload)
    VALUES (rec.id, 'delivery_enqueued', jsonb_build_object('source','enqueue_due_deliveries'));
    count_pushed := count_pushed + 1;
  END LOOP;
  RETURN count_pushed;
END;
$$;
