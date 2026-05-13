
ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_email_send_log_message_id ON public.email_send_log(message_id);

-- RPC the public tracker can call (no auth) to record an open/click event
CREATE OR REPLACE FUNCTION public.record_email_event(_message_id text, _event text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _message_id IS NULL OR _message_id = '' THEN RETURN; END IF;
  IF _event = 'open' THEN
    UPDATE public.email_send_log
       SET opened_at = COALESCE(opened_at, now()),
           last_opened_at = now(),
           open_count = open_count + 1
     WHERE message_id = _message_id;
  ELSIF _event = 'click' THEN
    UPDATE public.email_send_log
       SET clicked_at = COALESCE(clicked_at, now()),
           last_clicked_at = now(),
           click_count = click_count + 1,
           opened_at = COALESCE(opened_at, now()),
           last_opened_at = COALESCE(last_opened_at, now())
     WHERE message_id = _message_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_email_event(text, text) TO anon, authenticated, service_role;
