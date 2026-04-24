
-- Trigger: when featured_samples.audio_url changes (and lyrics exist),
-- asynchronously call the transcribe-sample edge function to regenerate
-- synced karaoke lyrics.

CREATE OR REPLACE FUNCTION public.trigger_transcribe_sample()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  edge_url text;
  internal_secret text;
BEGIN
  -- Only fire when audio_url actually changed to a non-null value AND lyrics exist
  IF NEW.audio_url IS NULL OR NEW.lyrics IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.audio_url IS NOT DISTINCT FROM OLD.audio_url THEN
    RETURN NEW;
  END IF;

  -- Reset existing synced_lyrics so the UI doesn't show stale alignment
  -- against the new audio while transcription is running.
  NEW.synced_lyrics := NULL;

  edge_url := 'https://tytxdnftsnspejnyfbmg.supabase.co/functions/v1/transcribe-sample';
  internal_secret := current_setting('app.settings.internal_trigger_secret', true);

  -- Fire-and-forget HTTP call (pg_net is async by default)
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', COALESCE(internal_secret, '')
    ),
    body := jsonb_build_object('sampleId', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the admin's update if the HTTP call setup fails
  RAISE WARNING 'trigger_transcribe_sample failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS featured_samples_audio_url_sync ON public.featured_samples;
CREATE TRIGGER featured_samples_audio_url_sync
  BEFORE INSERT OR UPDATE OF audio_url ON public.featured_samples
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_transcribe_sample();
