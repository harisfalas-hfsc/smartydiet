GRANT SELECT, UPDATE ON public.plan_generation_failures TO authenticated;

CREATE POLICY "Admins can read generation failures"
ON public.plan_generation_failures
FOR SELECT
TO authenticated
USING (public.is_app_admin(auth.uid()));

CREATE POLICY "Admins can mark generation failures read"
ON public.plan_generation_failures
FOR UPDATE
TO authenticated
USING (public.is_app_admin(auth.uid()))
WITH CHECK (public.is_app_admin(auth.uid()));