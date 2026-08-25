CREATE TABLE public.diet_plan_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  questionnaire_id uuid,
  generation_session_id uuid,
  stripe_session_id text,
  stripe_payment_intent text,
  environment text NOT NULL DEFAULT 'live',
  status text NOT NULL DEFAULT 'checkout_opened',
  reached_stage text NOT NULL DEFAULT 'Checkout opened',
  failure_stage text,
  failure_reason text,
  payment_failure_code text,
  amount_cents integer NOT NULL DEFAULT 999,
  currency text NOT NULL DEFAULT 'eur',
  checkout_opened_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  failed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT diet_plan_attempts_status_check CHECK (status IN ('checkout_opened','payment_processing','payment_declined','payment_cancelled','paid','generation_failed','generated')),
  CONSTRAINT diet_plan_attempts_environment_check CHECK (environment IN ('sandbox','live')),
  CONSTRAINT diet_plan_attempts_questionnaire_fkey FOREIGN KEY (questionnaire_id) REFERENCES public.questionnaires(id) ON DELETE SET NULL,
  CONSTRAINT diet_plan_attempts_session_fkey FOREIGN KEY (generation_session_id) REFERENCES public.generation_sessions(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE ON public.diet_plan_attempts TO authenticated;
GRANT ALL ON public.diet_plan_attempts TO service_role;

ALTER TABLE public.diet_plan_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own diet attempts"
ON public.diet_plan_attempts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own diet attempts"
ON public.diet_plan_attempts FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own attempts or admins read all"
ON public.diet_plan_attempts FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_app_admin(auth.uid()));

CREATE TRIGGER set_diet_plan_attempts_updated_at
BEFORE UPDATE ON public.diet_plan_attempts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE UNIQUE INDEX diet_plan_attempts_stripe_session_unique
ON public.diet_plan_attempts (stripe_session_id)
WHERE stripe_session_id IS NOT NULL;

CREATE INDEX diet_plan_attempts_user_created_idx
ON public.diet_plan_attempts (user_id, created_at DESC);

CREATE INDEX diet_plan_attempts_status_created_idx
ON public.diet_plan_attempts (status, created_at DESC);

INSERT INTO public.diet_plan_attempts (
  id, user_id, questionnaire_id, generation_session_id, stripe_session_id,
  stripe_payment_intent, environment, status, reached_stage, amount_cents,
  currency, checkout_opened_at, paid_at, completed_at, created_at, updated_at
)
SELECT
  gs.id, gs.user_id, gs.questionnaire_id, gs.id, gs.stripe_session_id,
  gs.stripe_payment_intent,
  CASE WHEN gs.stripe_session_id LIKE 'cs_test_%' THEN 'sandbox' ELSE 'live' END,
  CASE WHEN EXISTS (SELECT 1 FROM public.diet_plans dp WHERE dp.session_id = gs.id) THEN 'generated' ELSE 'paid' END,
  CASE WHEN EXISTS (SELECT 1 FROM public.diet_plans dp WHERE dp.session_id = gs.id) THEN 'Diet generated' ELSE 'Payment confirmed' END,
  gs.amount_cents, gs.currency, gs.created_at, gs.created_at,
  CASE WHEN EXISTS (SELECT 1 FROM public.diet_plans dp WHERE dp.session_id = gs.id) THEN gs.updated_at ELSE NULL END,
  gs.created_at, gs.updated_at
FROM public.generation_sessions gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.diet_plan_attempts (
  id, user_id, questionnaire_id, generation_session_id, status, reached_stage,
  failure_stage, failure_reason, checkout_opened_at, failed_at, created_at, updated_at
)
SELECT
  pgf.id, pgf.user_id, pgf.questionnaire_id, pgf.session_id,
  'generation_failed', COALESCE(pgf.stage, 'Plan generation'), pgf.stage,
  pgf.reason, pgf.occurred_at, pgf.occurred_at, pgf.occurred_at, pgf.updated_at
FROM public.plan_generation_failures pgf
WHERE NOT EXISTS (
  SELECT 1 FROM public.diet_plan_attempts dpa
  WHERE dpa.id = pgf.id
     OR (pgf.session_id IS NOT NULL AND dpa.generation_session_id = pgf.session_id)
)
ON CONFLICT (id) DO NOTHING;