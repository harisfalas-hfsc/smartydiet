ALTER TABLE public.generation_sessions
  DROP CONSTRAINT IF EXISTS generation_sessions_status_check;

ALTER TABLE public.generation_sessions
  ADD CONSTRAINT generation_sessions_status_check
  CHECK (status IN (
    'pending',
    'authorized',
    'paid',
    'completed',
    'failed',
    'refunded',
    'authorization_released'
  ));

ALTER TABLE public.diet_plan_attempts
  DROP CONSTRAINT IF EXISTS diet_plan_attempts_status_check;

ALTER TABLE public.diet_plan_attempts
  ADD CONSTRAINT diet_plan_attempts_status_check
  CHECK (status IN (
    'checkout_opened',
    'payment_processing',
    'authorized',
    'payment_declined',
    'payment_cancelled',
    'paid',
    'generation_failed',
    'generated',
    'capture_failed'
  ));

ALTER TABLE public.diet_plan_attempts
  DROP CONSTRAINT IF EXISTS diet_plan_attempts_failure_kind_check;

ALTER TABLE public.diet_plan_attempts
  ADD CONSTRAINT diet_plan_attempts_failure_kind_check
  CHECK (
    failure_kind IS NULL OR failure_kind IN (
      'payment_declined',
      'checkout_abandoned',
      'ai_balance',
      'technical',
      'capture_failed'
    )
  );