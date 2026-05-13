ALTER TABLE public.support_threads
  ADD COLUMN IF NOT EXISTS agentmail_thread_id text,
  ADD COLUMN IF NOT EXISTS agentmail_inbox_id text;

CREATE INDEX IF NOT EXISTS idx_support_threads_agentmail_thread_id
  ON public.support_threads(agentmail_thread_id);

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS agentmail_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_messages_agentmail_message_id
  ON public.support_messages(agentmail_message_id)
  WHERE agentmail_message_id IS NOT NULL;