ALTER TABLE public.featured_samples
  ADD COLUMN IF NOT EXISTS synced_lyrics jsonb;

COMMENT ON COLUMN public.featured_samples.synced_lyrics IS
  'Array of {start: number (seconds), end: number, text: string} for karaoke-style sync.';