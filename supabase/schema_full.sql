-- ============================================================
-- ArticleIQ — Full Schema + Migration (paste entire file)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";

CREATE TYPE user_plan AS ENUM ('free', 'paid');
CREATE TYPE issue_severity AS ENUM ('critical', 'warning', 'info');
CREATE TYPE scan_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  plan          user_plan NOT NULL DEFAULT 'free',
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  articles_scanned_this_month INT NOT NULL DEFAULT 0,
  ai_calls_this_month INT NOT NULL DEFAULT 0,
  plan_override_by UUID REFERENCES public.profiles(id),
  plan_overridden_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.zendesk_connectors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subdomain         TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_key_hint      TEXT,
  label             TEXT DEFAULT 'Zendesk',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_verified_at  TIMESTAMPTZ,
  sync_frequency    TEXT NOT NULL DEFAULT 'weekly' CHECK (sync_frequency IN ('daily', 'weekly', 'monthly')),
  last_synced_at    TIMESTAMPTZ,
  next_sync_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, subdomain)
);

CREATE TABLE public.scan_jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connector_id     UUID NOT NULL REFERENCES public.zendesk_connectors(id) ON DELETE CASCADE,
  status           scan_status NOT NULL DEFAULT 'pending',
  total_articles   INT DEFAULT 0,
  scanned_articles INT DEFAULT 0,
  issues_found     INT DEFAULT 0,
  critical_count   INT DEFAULT 0,
  warning_count    INT DEFAULT 0,
  info_count       INT DEFAULT 0,
  error_message    TEXT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.scanned_articles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_job_id           UUID NOT NULL REFERENCES public.scan_jobs(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  zendesk_article_id    BIGINT NOT NULL,
  title                 TEXT NOT NULL,
  url                   TEXT,
  section               TEXT,
  author                TEXT,
  word_count            INT DEFAULT 0,
  last_updated          TIMESTAMPTZ,
  locale                TEXT DEFAULT 'en-us',
  label_names           TEXT[],
  readability_score     FLOAT,
  quality_score         FLOAT,
  has_missing_metadata  BOOLEAN DEFAULT FALSE,
  broken_links_count    INT DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.article_issues (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_job_id  UUID NOT NULL REFERENCES public.scan_jobs(id) ON DELETE CASCADE,
  article_id   UUID NOT NULL REFERENCES public.scanned_articles(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  severity     issue_severity NOT NULL,
  issue_type   TEXT NOT NULL,
  description  TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}',
  resolved     BOOLEAN DEFAULT FALSE,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ai_actions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  article_id        UUID REFERENCES public.scanned_articles(id) ON DELETE SET NULL,
  action_type       TEXT NOT NULL,
  input_tokens      INT DEFAULT 0,
  output_tokens     INT DEFAULT 0,
  result_preview    TEXT,
  pushed_to_zendesk BOOLEAN DEFAULT FALSE,
  pushed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stripe_subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id        TEXT,
  status                 TEXT DEFAULT 'inactive',
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.usage_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_year       TEXT NOT NULL,
  articles_scanned INT DEFAULT 0,
  ai_calls         INT DEFAULT 0,
  scans_run        INT DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

CREATE INDEX idx_scan_jobs_user_id ON public.scan_jobs(user_id);
CREATE INDEX idx_scan_jobs_status ON public.scan_jobs(status);
CREATE INDEX idx_scanned_articles_scan_job ON public.scanned_articles(scan_job_id);
CREATE INDEX idx_article_issues_scan_job ON public.article_issues(scan_job_id);
CREATE INDEX idx_article_issues_severity ON public.article_issues(severity);
CREATE INDEX idx_article_issues_article ON public.article_issues(article_id);
CREATE INDEX idx_ai_actions_user ON public.ai_actions(user_id);
CREATE INDEX idx_usage_logs_user_month ON public.usage_logs(user_id, month_year);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zendesk_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanned_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_admin_read" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "connectors_own" ON public.zendesk_connectors
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "scanjobs_own" ON public.scan_jobs
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "scanjobs_admin" ON public.scan_jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "articles_own" ON public.scanned_articles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "issues_own" ON public.article_issues
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "ai_actions_own" ON public.ai_actions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "stripe_own" ON public.stripe_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "usage_own" ON public.usage_logs
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "usage_admin" ON public.usage_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER connectors_updated_at BEFORE UPDATE ON public.zendesk_connectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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

CREATE OR REPLACE VIEW public.connectors_due_for_sync AS
SELECT
  c.id, c.user_id, c.subdomain, c.api_key_encrypted,
  c.sync_frequency, c.next_sync_at, c.last_synced_at, p.plan
FROM public.zendesk_connectors c
JOIN public.profiles p ON p.id = c.user_id
WHERE c.is_active = TRUE
  AND (c.next_sync_at IS NULL OR c.next_sync_at <= NOW());

-- ============================================================
-- After running, make yourself admin:
-- UPDATE public.profiles SET is_admin = TRUE WHERE email = 'your@email.com';
-- ============================================================
