-- Enable realtime broadcast for tables surfaced in the admin panel.
-- Wrapped to silently ignore tables already added to the publication.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'orders',
    'quiz_events',
    'email_send_log',
    'suppressed_emails',
    'featured_samples',
    'refund_requests',
    'reaction_videos',
    'revision_requests',
    'support_threads',
    'support_messages',
    'reaction_reward_codes'
  ]) LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END LOOP;
END $$;