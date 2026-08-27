ALTER TABLE public.generation_sessions
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.generation_sessions DROP CONSTRAINT IF EXISTS generation_sessions_status_check;
ALTER TABLE public.generation_sessions ADD CONSTRAINT generation_sessions_status_check CHECK (status = ANY (ARRAY['pending'::text,'authorized'::text,'generating'::text,'paid'::text,'completed'::text,'failed'::text,'refunded'::text,'authorization_released'::text,'generation_failed'::text]));

CREATE INDEX IF NOT EXISTS idx_generation_sessions_retry ON public.generation_sessions(next_retry_at) WHERE status = 'generation_failed';