INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) IN ('smartydiet@outlook.com', 'harisfalas@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = 'admin'
    )
$$;

REVOKE ALL ON FUNCTION public.is_app_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO service_role;