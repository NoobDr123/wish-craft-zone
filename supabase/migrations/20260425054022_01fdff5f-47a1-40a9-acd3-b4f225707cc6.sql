-- Support inbox: threads (one per contact submission) + messages (in/out)

CREATE TABLE public.support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  order_id_text text,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'new', -- new | open | closed
  assigned_to uuid,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_threads_status_activity
  ON public.support_threads (status, last_activity_at DESC);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  direction text NOT NULL, -- 'inbound' (from customer) | 'outbound' (admin reply)
  author_user_id uuid, -- null for inbound
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_thread_created
  ON public.support_messages (thread_id, created_at ASC);

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Service role can do anything (used by submit-support-message edge function for inbound)
CREATE POLICY "Service role manages support_threads"
  ON public.support_threads FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages support_messages"
  ON public.support_messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admins can read everything
CREATE POLICY "Admins read support_threads"
  ON public.support_threads FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update support_threads"
  ON public.support_threads FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read support_messages"
  ON public.support_messages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert support_messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND direction = 'outbound');

-- updated_at trigger
CREATE TRIGGER trg_support_threads_updated_at
  BEFORE UPDATE ON public.support_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When a new message is added, bump thread last_activity_at
CREATE OR REPLACE FUNCTION public.bump_support_thread_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_threads
     SET last_activity_at = now(),
         status = CASE
           WHEN NEW.direction = 'outbound' THEN 'open'
           WHEN status = 'closed' THEN 'open'
           ELSE status
         END
   WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_messages_bump_activity
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_support_thread_activity();