CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Private scheduler token: readable only by the database itself / server role.
CREATE TABLE public.cron_tokens (
  name text PRIMARY KEY,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.cron_tokens FROM anon, authenticated;
GRANT ALL ON public.cron_tokens TO service_role;
ALTER TABLE public.cron_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO public.cron_tokens (name, token)
VALUES ('recovery', '426fe316248eb98a2af5a9f8f38cce9d00d590838eb1642b');

CREATE OR REPLACE FUNCTION public.run_recovery_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE t text;
BEGIN
  SELECT token INTO t FROM public.cron_tokens WHERE name = 'recovery';
  IF t IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := 'https://smartydiet.com/api/public/recover-abandoned',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || t),
    body := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_recovery_cron() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('smartydiet-recovery-daily', '0 10 * * *', $$SELECT public.run_recovery_cron();$$);