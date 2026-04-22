-- 1. MFA / TOTP for admins
CREATE TABLE public.user_mfa (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  totp_secret TEXT NOT NULL,
  enrolled BOOLEAN NOT NULL DEFAULT false,
  recovery_codes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mfa" ON public.user_mfa
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_mfa_updated_at BEFORE UPDATE ON public.user_mfa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. MFA verifications (proof of recent 2FA pass)
CREATE TABLE public.mfa_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '12 hours'),
  user_agent TEXT
);
CREATE INDEX idx_mfa_verifications_user ON public.mfa_verifications(user_id, expires_at DESC);
ALTER TABLE public.mfa_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own mfa verifications" ON public.mfa_verifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mfa verifications" ON public.mfa_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Refund / gift card requests
CREATE TABLE public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('refund','amazon_gift_card','both')),
  reason TEXT NOT NULL,
  reaction_video_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','paid')),
  amount_cents INTEGER,
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refund_requests_order ON public.refund_requests(order_id);
CREATE INDEX idx_refund_requests_status ON public.refund_requests(status, created_at DESC);
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own refund requests" ON public.refund_requests
  FOR SELECT USING (
    auth.uid() = user_id
    OR ((auth.jwt() ->> 'email') IS NOT NULL AND lower(buyer_email) = lower(auth.jwt() ->> 'email'))
  );
CREATE POLICY "Owners create own refund requests" ON public.refund_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.user_id = auth.uid()
             OR ((auth.jwt() ->> 'email') IS NOT NULL AND lower(o.buyer_email) = lower(auth.jwt() ->> 'email')))
    )
  );
CREATE POLICY "Admins read all refund requests" ON public.refund_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update refund requests" ON public.refund_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_refund_requests_updated_at BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Reaction videos
CREATE TABLE public.reaction_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  caption TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reaction_videos_order ON public.reaction_videos(order_id);
ALTER TABLE public.reaction_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own reactions" ON public.reaction_videos
  FOR SELECT USING (
    auth.uid() = user_id
    OR ((auth.jwt() ->> 'email') IS NOT NULL AND lower(buyer_email) = lower(auth.jwt() ->> 'email'))
  );
CREATE POLICY "Owners create own reactions" ON public.reaction_videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.user_id = auth.uid()
             OR ((auth.jwt() ->> 'email') IS NOT NULL AND lower(o.buyer_email) = lower(auth.jwt() ->> 'email')))
    )
  );
CREATE POLICY "Owners delete own reactions" ON public.reaction_videos
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins read all reactions" ON public.reaction_videos
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update reactions" ON public.reaction_videos
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_reaction_videos_updated_at BEFORE UPDATE ON public.reaction_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Revision requests (one free per order)
CREATE TABLE public.revision_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email TEXT NOT NULL,
  notes TEXT NOT NULL,
  is_free BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','delivered','rejected')),
  delivered_audio_url TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_one_free_revision_per_order
  ON public.revision_requests(order_id) WHERE is_free = true;
CREATE INDEX idx_revision_requests_status ON public.revision_requests(status, created_at DESC);
ALTER TABLE public.revision_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own revisions" ON public.revision_requests
  FOR SELECT USING (
    auth.uid() = user_id
    OR ((auth.jwt() ->> 'email') IS NOT NULL AND lower(buyer_email) = lower(auth.jwt() ->> 'email'))
  );
CREATE POLICY "Owners create own revisions" ON public.revision_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.user_id = auth.uid()
             OR ((auth.jwt() ->> 'email') IS NOT NULL AND lower(o.buyer_email) = lower(auth.jwt() ->> 'email')))
    )
  );
CREATE POLICY "Admins read all revisions" ON public.revision_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update revisions" ON public.revision_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_revision_requests_updated_at BEFORE UPDATE ON public.revision_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Reactions storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reactions', 'reactions', false, 104857600,
  ARRAY['video/mp4','video/quicktime','video/webm','video/x-m4v'])
ON CONFLICT (id) DO NOTHING;

-- Owners can upload to their own folder (path: {user_id}/{filename})
CREATE POLICY "Users upload own reaction" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reactions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users read own reaction" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reactions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users delete own reaction" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'reactions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Admins read all reactions storage" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reactions' AND public.has_role(auth.uid(), 'admin')
  );

-- 7. Admin-only helper to check whether a user has a recent valid MFA session
CREATE OR REPLACE FUNCTION public.has_valid_mfa(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mfa_verifications
    WHERE user_id = _user_id AND expires_at > now()
  );
$$;