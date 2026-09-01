ALTER TABLE public.generation_sessions
  ADD COLUMN IF NOT EXISTS customer_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS recovery_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS abandoned_alert_at timestamptz;