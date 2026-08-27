ALTER TABLE public.generation_sessions
  DROP CONSTRAINT IF EXISTS generation_sessions_status_check;

ALTER TABLE public.generation_sessions
  ADD CONSTRAINT generation_sessions_status_check
  CHECK (status IN (
    'pending', 'authorized', 'generating', 'completed', 'paid', 'failed',
    'authorization_released', 'refunded'
  ));
