CREATE POLICY "Backend services manage recovery tokens"
ON public.cron_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);