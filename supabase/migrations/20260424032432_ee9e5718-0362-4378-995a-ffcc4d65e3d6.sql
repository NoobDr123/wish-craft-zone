
-- Restrict the auto karaoke transcribe trigger to ONLY the hero featured sample
-- (published = true AND sort_order = 0). Other samples must be synced manually
-- from the admin panel to avoid burning AudioShake/AI credits on every generation.

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

  -- Only auto-sync the hero song. Hero = published AND sort_order = 0.
  IF NEW.published IS DISTINCT FROM TRUE OR NEW.sort_order IS DISTINCT FROM 0 THEN
    RAISE NOTICE 'trigger_transcribe_sample: sample % is not hero, skipping auto sync', NEW.id;
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
