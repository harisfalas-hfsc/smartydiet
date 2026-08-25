ALTER TABLE public.generation_sessions
DROP CONSTRAINT generation_sessions_status_check;

ALTER TABLE public.generation_sessions
ADD CONSTRAINT generation_sessions_status_check
CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'completed'::text, 'failed'::text, 'refunded'::text]));