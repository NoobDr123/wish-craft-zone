
ALTER TABLE public.support_threads
  ADD COLUMN IF NOT EXISTS ai_category text,
  ADD COLUMN IF NOT EXISTS ai_auto_reply_safe boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_replied_at timestamptz;

INSERT INTO public.internal_settings (key, value)
VALUES ('support_auto_reply_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
