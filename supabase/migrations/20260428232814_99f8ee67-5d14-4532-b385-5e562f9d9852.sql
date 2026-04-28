-- ============================================================
-- AD STUDIO TABLES
-- ============================================================

-- 1. Ad music tracks (separate from customer orders)
CREATE TABLE public.ad_music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  genre TEXT,
  mood TEXT,
  duration_seconds INTEGER,
  -- KIE / Suno tracking
  kie_task_id TEXT,
  kie_status TEXT NOT NULL DEFAULT 'pending', -- pending, generating, ready, failed
  kie_error TEXT,
  audio_url TEXT,
  cover_image_url TEXT,
  lyrics TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_music_kie_task ON public.ad_music_tracks(kie_task_id) WHERE kie_task_id IS NOT NULL;
CREATE INDEX idx_ad_music_status ON public.ad_music_tracks(kie_status);

-- 2. Ad campaigns (the saved creative)
CREATE TABLE public.ad_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  background_image_url TEXT,
  music_track_id UUID REFERENCES public.ad_music_tracks(id) ON DELETE SET NULL,
  -- Overlay configuration (JSON for flexibility)
  overlays JSONB NOT NULL DEFAULT '{
    "headline": "",
    "subhead": "",
    "cta": "",
    "vinyl_enabled": true,
    "vinyl_song_title": "",
    "vinyl_subtitle": "",
    "headline_color": "#ffffff",
    "headline_font": "display"
  }'::jsonb,
  aspect_ratio TEXT NOT NULL DEFAULT '1:1', -- 1:1 or 9:16
  duration_seconds INTEGER NOT NULL DEFAULT 30,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_campaigns_created ON public.ad_campaigns(created_at DESC);

-- 3. Ad renders (Lambda render jobs)
CREATE TABLE public.ad_renders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  aspect_ratio TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, rendering, done, failed
  -- Remotion Lambda tracking
  lambda_render_id TEXT,
  lambda_bucket_name TEXT,
  output_url TEXT, -- final MP4 URL
  progress NUMERIC, -- 0..1
  error_message TEXT,
  cost_cents INTEGER, -- Lambda render cost estimate
  duration_ms INTEGER, -- how long render took
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_renders_campaign ON public.ad_renders(campaign_id);
CREATE INDEX idx_ad_renders_status ON public.ad_renders(status);

-- ============================================================
-- TIMESTAMPS
-- ============================================================
CREATE TRIGGER update_ad_music_tracks_updated_at
  BEFORE UPDATE ON public.ad_music_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_campaigns_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_renders_updated_at
  BEFORE UPDATE ON public.ad_renders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS — admin-only for everything
-- ============================================================
ALTER TABLE public.ad_music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_renders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ad music tracks"
  ON public.ad_music_tracks
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage ad campaigns"
  ON public.ad_campaigns
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage ad renders"
  ON public.ad_renders
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- STORAGE — ad-studio bucket (public read, admin write)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-studio', 'ad-studio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read ad-studio"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ad-studio');

CREATE POLICY "Admins upload to ad-studio"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ad-studio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update ad-studio"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'ad-studio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete ad-studio"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'ad-studio' AND public.has_role(auth.uid(), 'admin'));