CREATE TABLE IF NOT EXISTS public.system_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL DEFAULT 'false'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_settings TO anon;
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system settings readable by everyone"
  ON public.system_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "system settings insert by admin"
  ON public.system_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "system settings update by admin"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));

CREATE TRIGGER system_settings_set_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('free_access_mode', 'false'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;