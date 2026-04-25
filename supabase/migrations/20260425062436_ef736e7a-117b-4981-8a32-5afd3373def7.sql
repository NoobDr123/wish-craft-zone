DROP POLICY IF EXISTS "Anyone can update own session by session_id" ON public.page_sessions;

CREATE POLICY "Update own session row only"
ON public.page_sessions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (session_id = (SELECT session_id FROM public.page_sessions p WHERE p.id = page_sessions.id));