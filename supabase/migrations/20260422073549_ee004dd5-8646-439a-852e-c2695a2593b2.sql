-- 1. Explicit UPDATE policy on reactions storage bucket — owner-scoped
DROP POLICY IF EXISTS "Owners update own reaction files" ON storage.objects;
CREATE POLICY "Owners update own reaction files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reactions'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'reactions'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 2. RESTRICTIVE policy on user_roles: forbid self-grants.
-- A RESTRICTIVE policy must pass IN ADDITION to any permissive policy,
-- so this guarantees no INSERT path lets a user grant themselves a role.
DROP POLICY IF EXISTS "Block self role grants" ON public.user_roles;
CREATE POLICY "Block self role grants"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (user_id <> auth.uid());