-- Admin IP allowlist
CREATE TABLE public.admin_ip_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL UNIQUE,
  label text NOT NULL,
  notes text,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_ip_allowlist ENABLE ROW LEVEL SECURITY;

-- Admins can fully manage the allowlist
CREATE POLICY "Admins read ip allowlist"
  ON public.admin_ip_allowlist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert ip allowlist"
  ON public.admin_ip_allowlist FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete ip allowlist"
  ON public.admin_ip_allowlist FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role full access (used by the server route that performs IP checks)
CREATE POLICY "Service role manages ip allowlist"
  ON public.admin_ip_allowlist FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_admin_ip_allowlist_ip ON public.admin_ip_allowlist(ip_address);