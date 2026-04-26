ALTER TABLE public.page_sessions
  ADD COLUMN IF NOT EXISTS host text;

CREATE INDEX IF NOT EXISTS idx_page_sessions_host ON public.page_sessions (host);