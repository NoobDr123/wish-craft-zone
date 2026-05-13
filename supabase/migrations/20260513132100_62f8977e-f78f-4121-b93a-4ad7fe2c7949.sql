ALTER TABLE public.support_threads
  ADD COLUMN IF NOT EXISTS spam_classification text,
  ADD COLUMN IF NOT EXISTS spam_score numeric,
  ADD COLUMN IF NOT EXISTS spam_reason text,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_suggested_reply text,
  ADD COLUMN IF NOT EXISTS ai_classified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_support_threads_spam ON public.support_threads(spam_classification);