-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily digest to run every day at 8 AM EST (12 PM UTC)
SELECT cron.schedule(
  'daily-digest-email',
  '0 12 * * *', -- Every day at 12:00 PM UTC (8:00 AM EST)
  $$
  SELECT
    net.http_post(
        url:='https://gxatnnzwaggcvzzurgsq.supabase.co/functions/v1/send-daily-digest',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YXRubnp3YWdnY3Z6enVyZ3NxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYxNDMzMywiZXhwIjoyMDY4MTkwMzMzfQ.Q9VJ5dQUWpRfzoFf0fA5gqlCLb_j2PZYG_e7HiK-qWo"}'::jsonb,
        body:='{"force": false}'::jsonb
    ) as request_id;
  $$
);