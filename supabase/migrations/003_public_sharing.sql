-- Run in Supabase SQL Editor
-- Enables public read-only access to shared scans

-- Add shared flag to scan_jobs
ALTER TABLE public.scan_jobs
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

-- Policy: anyone can read shared scans (no auth required)
CREATE POLICY "scanjobs_public_shared" ON public.scan_jobs
  FOR SELECT USING (is_shared = TRUE);

-- Policy: anyone can read articles from shared scans
CREATE POLICY "articles_public_shared" ON public.scanned_articles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scan_jobs
      WHERE id = scan_job_id AND is_shared = TRUE
    )
  );

-- Policy: anyone can read issues from shared scans
CREATE POLICY "issues_public_shared" ON public.article_issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scan_jobs
      WHERE id = scan_job_id AND is_shared = TRUE
    )
  );
