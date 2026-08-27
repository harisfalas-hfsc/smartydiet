CREATE OR REPLACE FUNCTION public.run_generation_retry_cron()
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
    url := 'https://smartydiet.com/api/public/retry-generations',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || t),
    body := '{}'::jsonb
  );
END;
$$;

SELECT cron.schedule('smartydiet-generation-retry', '*/5 * * * *', 'SELECT public.run_generation_retry_cron();');