ALTER VIEW public.public_shared_songs SET (security_invoker = false);
GRANT SELECT ON public.public_shared_songs TO anon, authenticated;