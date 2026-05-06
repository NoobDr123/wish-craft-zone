-- Public storage bucket for quiz dog photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('dog-photos', 'dog-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone (anon + authed) can upload
CREATE POLICY "Anyone can upload dog photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dog-photos');

-- Public read
CREATE POLICY "Anyone can view dog photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'dog-photos');