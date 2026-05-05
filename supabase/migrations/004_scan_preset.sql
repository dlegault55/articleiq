-- Run in Supabase SQL Editor

ALTER TABLE public.scan_jobs
  ADD COLUMN IF NOT EXISTS preset TEXT DEFAULT 'standard' CHECK (preset IN ('fast', 'standard', 'full')),
  ADD COLUMN IF NOT EXISTS label TEXT;
