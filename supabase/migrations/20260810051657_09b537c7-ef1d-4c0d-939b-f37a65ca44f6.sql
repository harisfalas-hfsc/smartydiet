CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.unschedule('smartydiet-billing-run') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'smartydiet-billing-run');
SELECT cron.schedule(
  'smartydiet-billing-run',
  '7 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--2c2733f2-8af9-46ea-af40-3a1623eeb94a.lovable.app/api/public/hooks/billing-run',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_-AjhLfd2k7SeIzX0_9VdQA_pZ0tSEKX"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);