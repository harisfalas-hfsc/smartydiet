CREATE TABLE public.plan_generation_failures (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id uuid REFERENCES public.generation_sessions(id) ON DELETE SET NULL,
  questionnaire_id uuid REFERENCES public.questionnaires(id) ON DELETE SET NULL,
  stage text NOT NULL,
  reason text NOT NULL,
  refinement text,
  email_status text NOT NULL DEFAULT 'pending',
  email_error text,
  email_message_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.plan_generation_failures TO service_role;
ALTER TABLE public.plan_generation_failures ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_plan_generation_failures_updated_at
BEFORE UPDATE ON public.plan_generation_failures
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE UNIQUE INDEX generation_sessions_stripe_session_id_unique
ON public.generation_sessions (stripe_session_id)
WHERE stripe_session_id IS NOT NULL;

CREATE UNIQUE INDEX generation_sessions_stripe_payment_intent_unique
ON public.generation_sessions (stripe_payment_intent)
WHERE stripe_payment_intent IS NOT NULL;

CREATE INDEX plan_generation_failures_occurred_at_idx
ON public.plan_generation_failures (occurred_at DESC);

CREATE INDEX plan_generation_failures_unread_idx
ON public.plan_generation_failures (read_at, occurred_at DESC);