-- Featured samples table for the homepage "Listen" section
CREATE TABLE public.featured_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Display fields
  title TEXT NOT NULL,
  quote TEXT,
  for_text TEXT,
  genre_label TEXT NOT NULL DEFAULT 'Acoustic Folk · Female Voice',
  cover_image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,

  -- Generation inputs (the "brief")
  recipient_name TEXT NOT NULL,
  relationship TEXT,
  stage TEXT,
  story_prompt TEXT NOT NULL,
  genre TEXT NOT NULL DEFAULT 'Acoustic Folk',
  tempo TEXT NOT NULL DEFAULT 'Mid-tempo',
  voice TEXT NOT NULL DEFAULT 'No Preference',

  -- Generation output
  brief JSONB,
  brief_score JSONB,
  lyrics TEXT,
  audio_url TEXT,
  audio_variants JSONB,

  -- Pipeline tracking
  status TEXT NOT NULL DEFAULT 'draft',
  kie_task_id TEXT UNIQUE,
  kie_submitted_at TIMESTAMPTZ,
  kie_callback_received_at TIMESTAMPTZ,
  flag_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the homepage query
CREATE INDEX idx_featured_samples_published_sort
  ON public.featured_samples (published, sort_order)
  WHERE published = true;

CREATE INDEX idx_featured_samples_kie_task
  ON public.featured_samples (kie_task_id)
  WHERE kie_task_id IS NOT NULL;

-- Updated-at trigger
CREATE TRIGGER update_featured_samples_updated_at
BEFORE UPDATE ON public.featured_samples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.featured_samples ENABLE ROW LEVEL SECURITY;

-- Public can view only published samples
CREATE POLICY "Anyone can view published featured samples"
ON public.featured_samples
FOR SELECT
USING (published = true);

-- Admins can view everything (drafts, failed, etc.)
CREATE POLICY "Admins can view all featured samples"
ON public.featured_samples
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert featured samples"
ON public.featured_samples
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update featured samples"
ON public.featured_samples
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete featured samples"
ON public.featured_samples
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));