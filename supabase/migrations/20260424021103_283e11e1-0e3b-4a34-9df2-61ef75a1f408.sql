
CREATE TABLE IF NOT EXISTS public.internal_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages internal_settings" ON public.internal_settings;
CREATE POLICY "Service role manages internal_settings"
  ON public.internal_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins read internal_settings" ON public.internal_settings;
CREATE POLICY "Admins read internal_settings"
  ON public.internal_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Update the trigger function to read the secret from internal_settings
CREATE OR REPLACE FUNCTION public.trigger_transcribe_sample()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  edge_url text := 'https://tytxdnftsnspejnyfbmg.supabase.co/functions/v1/transcribe-sample';
  internal_secret text;
BEGIN
  IF NEW.audio_url IS NULL OR NEW.lyrics IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.audio_url IS NOT DISTINCT FROM OLD.audio_url THEN
    RETURN NEW;
  END IF;

  NEW.synced_lyrics := NULL;

  SELECT value INTO internal_secret
    FROM public.internal_settings
    WHERE key = 'transcribe_trigger_secret';

  IF internal_secret IS NULL THEN
    RAISE WARNING 'transcribe_trigger_secret not configured in internal_settings';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', internal_secret
    ),
    body := jsonb_build_object('sampleId', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trigger_transcribe_sample failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
