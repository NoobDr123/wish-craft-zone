
-- Replace cron jobs with hardcoded anon key (functions are verify_jwt=false anyway)
DO $$
DECLARE jid bigint;
BEGIN
  FOR jid IN SELECT jobid FROM cron.job WHERE jobname IN (
    'drain-generate-brief',
    'drain-submit-to-kie',
    'drain-process-kie-callback',
    'drain-deliver-song'
  ) LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'drain-generate-brief',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tytxdnftsnspejnyfbmg.supabase.co/functions/v1/drain-queue',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dHhkbmZ0c25zcGVqbnlmYm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MDIxMDgsImV4cCI6MjA5MjM3ODEwOH0.4wm0mOTEFkmrxJ5ew3qbLENfonzAbp0o3xqYXcHt6_A"}'::jsonb,
    body := '{"queue":"generate_brief","target":"generate-brief","batch":5}'::jsonb
  );
  $cron$
);

SELECT cron.schedule(
  'drain-submit-to-kie',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tytxdnftsnspejnyfbmg.supabase.co/functions/v1/drain-queue',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dHhkbmZ0c25zcGVqbnlmYm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MDIxMDgsImV4cCI6MjA5MjM3ODEwOH0.4wm0mOTEFkmrxJ5ew3qbLENfonzAbp0o3xqYXcHt6_A"}'::jsonb,
    body := '{"queue":"submit_to_kie","target":"submit-to-kie","batch":5}'::jsonb
  );
  $cron$
);

SELECT cron.schedule(
  'drain-process-kie-callback',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tytxdnftsnspejnyfbmg.supabase.co/functions/v1/drain-queue',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dHhkbmZ0c25zcGVqbnlmYm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MDIxMDgsImV4cCI6MjA5MjM3ODEwOH0.4wm0mOTEFkmrxJ5ew3qbLENfonzAbp0o3xqYXcHt6_A"}'::jsonb,
    body := '{"queue":"process_kie_callback","target":"process-kie-callback","batch":10}'::jsonb
  );
  $cron$
);

SELECT cron.schedule(
  'drain-deliver-song',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tytxdnftsnspejnyfbmg.supabase.co/functions/v1/drain-queue',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dHhkbmZ0c25zcGVqbnlmYm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MDIxMDgsImV4cCI6MjA5MjM3ODEwOH0.4wm0mOTEFkmrxJ5ew3qbLENfonzAbp0o3xqYXcHt6_A"}'::jsonb,
    body := '{"queue":"deliver_song","target":"deliver-song","batch":10}'::jsonb
  );
  $cron$
);
