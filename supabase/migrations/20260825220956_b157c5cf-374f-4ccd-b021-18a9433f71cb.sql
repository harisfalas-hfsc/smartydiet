ALTER TABLE public.diet_plan_attempts
  ADD COLUMN email_status text,
  ADD COLUMN email_error text,
  ADD COLUMN email_message_id text,
  ADD COLUMN email_recipient text,
  ADD COLUMN email_dispatched_at timestamp with time zone;