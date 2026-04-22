
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE id = 'a548f77c-0299-4c0e-87a4-841730d7508d';

INSERT INTO public.user_roles (user_id, role)
VALUES ('a548f77c-0299-4c0e-87a4-841730d7508d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
