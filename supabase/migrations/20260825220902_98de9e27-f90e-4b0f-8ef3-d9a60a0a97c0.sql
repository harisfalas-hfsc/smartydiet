ALTER TABLE public.diet_plan_attempts
  ADD COLUMN failure_kind text,
  ADD CONSTRAINT diet_plan_attempts_failure_kind_check
    CHECK (failure_kind IS NULL OR failure_kind IN ('payment_declined','checkout_abandoned','ai_balance','technical'));

ALTER TABLE public.plan_generation_failures
  ADD COLUMN failure_kind text NOT NULL DEFAULT 'technical',
  ADD COLUMN email_recipient text,
  ADD COLUMN email_dispatched_at timestamp with time zone,
  ADD CONSTRAINT plan_generation_failures_failure_kind_check
    CHECK (failure_kind IN ('ai_balance','technical'));

CREATE INDEX diet_plan_attempts_failure_kind_created_idx
  ON public.diet_plan_attempts (failure_kind, created_at DESC)
  WHERE failure_kind IS NOT NULL;

CREATE INDEX plan_generation_failures_failure_kind_occurred_idx
  ON public.plan_generation_failures (failure_kind, occurred_at DESC);