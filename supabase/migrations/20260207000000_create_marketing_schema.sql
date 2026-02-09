-- ============================================================================
-- MARKETING ORCHESTRATOR SCHEMA
-- Single-user marketing automation for Salt Core social presence
-- ============================================================================

-- Create dedicated schema for marketing data
CREATE SCHEMA IF NOT EXISTS marketing;

-- ============================================================================
-- ACCOUNTS TABLE
-- Stores social accounts: @gabimartinsdev (personal) and @saltcorehq (product)
-- ============================================================================

CREATE TABLE marketing.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL,           -- @gabimartinsdev or @saltcorehq
  platform text NOT NULL,         -- x, linkedin
  account_type text NOT NULL,     -- personal, product
  effort_allocation int DEFAULT 50 CHECK (effort_allocation >= 0 AND effort_allocation <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(handle, platform)
);

COMMENT ON TABLE marketing.accounts IS 'Social media accounts managed by the marketing orchestrator';
COMMENT ON COLUMN marketing.accounts.effort_allocation IS 'Percentage of content effort allocated to this account (0-100)';

-- ============================================================================
-- POSTS TABLE
-- Content lifecycle management
-- ============================================================================

CREATE TABLE marketing.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES marketing.accounts(id) ON DELETE CASCADE,
  content text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('bip', 'insight', 'engagement', 'promo', 'thread', 'pillar', 'weekend')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'voice_check', 'ready', 'scheduled', 'published', 'failed')),
  typefully_id text,              -- ID from Typefully API
  voice_score int CHECK (voice_score >= 0 AND voice_score <= 100),
  human_score int CHECK (human_score >= 0 AND human_score <= 100),
  voice_flags text[],             -- ["weak_opener", "ai_detected", "too_formal"]
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Metadata for debugging and analysis
  generation_metadata jsonb DEFAULT '{}'
);

CREATE INDEX posts_account_id_idx ON marketing.posts(account_id);
CREATE INDEX posts_status_idx ON marketing.posts(status);
CREATE INDEX posts_scheduled_for_idx ON marketing.posts(scheduled_for) WHERE scheduled_for IS NOT NULL;

COMMENT ON TABLE marketing.posts IS 'Social media posts in various lifecycle stages';
COMMENT ON COLUMN marketing.posts.content_type IS 'Type of content: bip (build in public), insight, engagement, promo, thread, pillar, weekend';
COMMENT ON COLUMN marketing.posts.voice_flags IS 'Array of voice issues detected by Voice Guardian';
COMMENT ON COLUMN marketing.posts.generation_metadata IS 'JSON metadata about how the post was generated (source, template, research used)';

-- ============================================================================
-- RESEARCH TABLE
-- Apify scraping results and pattern analysis
-- ============================================================================

CREATE TABLE marketing.research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,            -- #BuildInPublic, @levelsio, etc.
  query_type text NOT NULL CHECK (query_type IN ('hashtag', 'competitor', 'topic', 'trend')),
  platform text NOT NULL,         -- x, linkedin
  results jsonb NOT NULL DEFAULT '[]',  -- Raw scraped data
  patterns jsonb,                 -- Extracted patterns after analysis
  posts_analyzed int DEFAULT 0,
  avg_engagement float,
  top_hooks text[],               -- Best-performing opening lines
  scraped_at timestamptz DEFAULT now()
);

CREATE INDEX research_query_idx ON marketing.research(query);
CREATE INDEX research_scraped_at_idx ON marketing.research(scraped_at);

COMMENT ON TABLE marketing.research IS 'Research data from Apify scraping and pattern analysis';
COMMENT ON COLUMN marketing.research.patterns IS 'Extracted patterns: common words, hook styles, engagement triggers';
COMMENT ON COLUMN marketing.research.top_hooks IS 'Array of high-performing opening lines to learn from';

-- ============================================================================
-- METRICS TABLE
-- Post performance tracking
-- ============================================================================

CREATE TABLE marketing.metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES marketing.posts(id) ON DELETE CASCADE,
  impressions int DEFAULT 0,
  likes int DEFAULT 0,
  replies int DEFAULT 0,
  reposts int DEFAULT 0,
  clicks int DEFAULT 0,
  engagement_rate float,          -- (likes + replies + reposts) / impressions
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX metrics_post_id_idx ON marketing.metrics(post_id);
CREATE INDEX metrics_recorded_at_idx ON marketing.metrics(recorded_at);

COMMENT ON TABLE marketing.metrics IS 'Performance metrics for published posts';
COMMENT ON COLUMN marketing.metrics.engagement_rate IS 'Calculated as (likes + replies + reposts) / impressions';

-- ============================================================================
-- CONTENT TEMPLATES TABLE
-- Reusable content templates with performance data
-- ============================================================================

CREATE TABLE marketing.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('bip', 'insight', 'engagement', 'promo', 'thread', 'pillar', 'weekend')),
  template text NOT NULL,         -- Template with {placeholders}
  platform text NOT NULL,         -- x, linkedin
  times_used int DEFAULT 0,
  avg_engagement float,           -- Average engagement when this template is used
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE marketing.templates IS 'Reusable content templates with performance tracking';

-- ============================================================================
-- SEED DATA
-- Initial accounts for @gabimartinsdev and @saltcorehq
-- ============================================================================

INSERT INTO marketing.accounts (handle, platform, account_type, effort_allocation)
VALUES
  ('@gabimartinsdev', 'x', 'personal', 80),
  ('@gabimartinsdev', 'linkedin', 'personal', 70),
  ('@saltcorehq', 'x', 'product', 20),
  ('@saltcorehq', 'linkedin', 'product', 30)
ON CONFLICT (handle, platform) DO NOTHING;

-- ============================================================================
-- SEED TEMPLATES
-- Initial content templates from existing weekly-prep.ts
-- ============================================================================

INSERT INTO marketing.templates (name, content_type, template, platform)
VALUES
  -- BIP templates
  ('bip_shipped', 'bip', 'shipped yesterday:\n\n{commits}', 'x'),
  ('bip_finally', 'bip', 'finally {commits}. small wins add up.', 'x'),
  ('bip_progress', 'bip', 'yesterday: {commits}. progress.', 'x'),
  ('bip_no_code', 'bip', 'no code today. some days you need to step back and think.', 'x'),
  ('bip_research', 'bip', 'research day yesterday. reading, planning, not coding. back at it today.', 'x'),

  -- Weekend templates
  ('weekend_sat_coffee', 'weekend', 'saturday morning coffee + code. the best.', 'x'),
  ('weekend_sat_lies', 'weekend', 'technically not working today. just fixing one small thing. (lies)', 'x'),
  ('weekend_sun_rested', 'weekend', 'rested and ready for the week.', 'x'),
  ('weekend_sun_learned', 'weekend', 'one thing i learned this week: {insight}', 'x'),

  -- Engagement templates
  ('engagement_question', 'engagement', 'question for you guys: {question}', 'x'),
  ('engagement_curious', 'engagement', 'curious: {question}', 'x'),
  ('engagement_shoutout', 'engagement', 'shoutout to everyone building in public. its not easy but its worth it.', 'x'),
  ('engagement_working_on', 'engagement', 'what are you all working on this week?', 'x'),

  -- Thread templates
  ('thread_learned', 'thread', 'okay so heres what i learned this week:\n\n1/ {point1}\n\n2/ {point2}\n\n3/ {point3}\n\n4/ {takeaway}', 'x')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- Helper functions for the marketing orchestrator
-- ============================================================================

-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION marketing.calculate_engagement_rate(
  p_impressions int,
  p_likes int,
  p_replies int,
  p_reposts int
)
RETURNS float
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_impressions = 0 THEN
    RETURN 0;
  END IF;
  RETURN (p_likes + p_replies + p_reposts)::float / p_impressions::float;
END;
$$;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION marketing.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON marketing.accounts
  FOR EACH ROW EXECUTE FUNCTION marketing.update_updated_at();

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON marketing.posts
  FOR EACH ROW EXECUTE FUNCTION marketing.update_updated_at();

CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON marketing.templates
  FOR EACH ROW EXECUTE FUNCTION marketing.update_updated_at();

-- ============================================================================
-- NOTE: No RLS needed
-- This is single-user (Salt Core only), not multi-tenant
-- Access is controlled at the application level via service key
-- ============================================================================
