-- 1. Free access mode OFF (paid mode)
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('free_access_mode', 'false'::jsonb)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'false'::jsonb, updated_at = now();

-- 2. Testimonials (social proof) — only approved ones are public
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_context text,
  quote text NOT NULL,
  rating integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  approved boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved testimonials are public" ON public.testimonials
  FOR SELECT TO anon, authenticated USING (approved = true OR public.is_app_admin(auth.uid()));
CREATE POLICY "admins insert testimonials" ON public.testimonials
  FOR INSERT TO authenticated WITH CHECK (public.is_app_admin(auth.uid()));
CREATE POLICY "admins update testimonials" ON public.testimonials
  FOR UPDATE TO authenticated USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));
CREATE POLICY "admins delete testimonials" ON public.testimonials
  FOR DELETE TO authenticated USING (public.is_app_admin(auth.uid()));
CREATE TRIGGER testimonials_set_updated_at BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Email leads (non-buyer capture)
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text NOT NULL DEFAULT 'site',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX leads_email_unique ON public.leads (lower(email));
GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read leads" ON public.leads
  FOR SELECT TO authenticated USING (public.is_app_admin(auth.uid()));

-- 4. Abandoned-checkout recovery log (one email per user per stage)
CREATE TABLE public.recovery_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questionnaire_id uuid REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  stage text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX recovery_emails_unique ON public.recovery_emails (user_id, questionnaire_id, stage);
GRANT SELECT ON public.recovery_emails TO authenticated;
GRANT ALL ON public.recovery_emails TO service_role;
ALTER TABLE public.recovery_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read recovery emails" ON public.recovery_emails
  FOR SELECT TO authenticated USING (public.is_app_admin(auth.uid()));