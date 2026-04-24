
-- Anonymous session tracking
CREATE TABLE public.page_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  referrer text,
  landing_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  buyer_email text,
  user_id uuid,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_sessions_session_id ON public.page_sessions(session_id);
CREATE INDEX idx_page_sessions_email ON public.page_sessions(buyer_email);
CREATE INDEX idx_page_sessions_first_seen ON public.page_sessions(first_seen_at DESC);

ALTER TABLE public.page_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert sessions"
  ON public.page_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update own session by session_id"
  ON public.page_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins read all sessions"
  ON public.page_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages sessions"
  ON public.page_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Funnel event tracking
CREATE TABLE public.quiz_events (
  id bigserial PRIMARY KEY,
  session_id text NOT NULL,
  event_type text NOT NULL,
  -- e.g. 'lander_view','lander_cta_click','quiz_start','question_view','question_answer',
  --      'quiz_complete','checkout_view','checkout_submit','payment_success','payment_failed',
  --      'upsell_view','upsell_accept','upsell_decline'
  step_index integer,
  step_key text,
  time_on_step_ms integer,
  payload jsonb,
  buyer_email text,
  order_id uuid,
  upsell_type text,
  amount_cents integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_events_session ON public.quiz_events(session_id);
CREATE INDEX idx_quiz_events_type ON public.quiz_events(event_type);
CREATE INDEX idx_quiz_events_created ON public.quiz_events(created_at DESC);
CREATE INDEX idx_quiz_events_email ON public.quiz_events(buyer_email);
CREATE INDEX idx_quiz_events_order ON public.quiz_events(order_id);
CREATE INDEX idx_quiz_events_step ON public.quiz_events(event_type, step_index);

ALTER TABLE public.quiz_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events"
  ON public.quiz_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read all events"
  ON public.quiz_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages events"
  ON public.quiz_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
