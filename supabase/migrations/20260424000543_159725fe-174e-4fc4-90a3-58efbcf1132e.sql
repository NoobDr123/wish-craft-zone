ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS auto_user_provisioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz;