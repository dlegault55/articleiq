-- ============================================================
-- ArticleIQ — Migration: Scheduled Sync
-- Run in Supabase SQL Editor
-- ============================================================

-- Add frequency + scheduling columns to zendesk_connectors
ALTER TABLE public.zendesk_connectors
  ADD COLUMN IF NOT EXISTS sync_frequency TEXT NOT NULL DEFAULT 'weekly'
    CHECK (sync_frequency IN ('daily', 'weekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_sync_at TIMESTAMPTZ;

-- Set initial next_sync_at for existing connectors
UPDATE public.zendesk_connectors
SET next_sync_at = NOW() + INTERVAL '7 days'
WHERE next_sync_at IS NULL;

-- ============================================================
-- Function to calculate next sync time
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_next_sync(frequency TEXT)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN CASE frequency
    WHEN 'daily'   THEN NOW() + INTERVAL '1 day'
    WHEN 'weekly'  THEN NOW() + INTERVAL '7 days'
    WHEN 'monthly' THEN NOW() + INTERVAL '30 days'
    ELSE NOW() + INTERVAL '7 days'
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- View: connectors due for sync
-- ============================================================
CREATE OR REPLACE VIEW public.connectors_due_for_sync AS
SELECT
  c.id,
  c.user_id,
  c.subdomain,
  c.api_key_encrypted,
  c.sync_frequency,
  c.next_sync_at,
  c.last_synced_at,
  p.plan
FROM public.zendesk_connectors c
JOIN public.profiles p ON p.id = c.user_id
WHERE
  c.is_active = TRUE
  AND (c.next_sync_at IS NULL OR c.next_sync_at <= NOW());

-- ============================================================
-- Enable pg_cron (run once — may already be enabled)
-- ============================================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- Schedule: call Edge Function every hour to process due syncs
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY
-- ============================================================
-- SELECT cron.schedule(
--   'articleiq-scheduled-sync',
--   '0 * * * *',  -- every hour
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-sync',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
