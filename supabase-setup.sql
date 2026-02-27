-- Crypto Mafia Newsletter — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. News sources (RSS feeds + X/Twitter)
CREATE TABLE IF NOT EXISTS news_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT,
    category TEXT NOT NULL DEFAULT 'rss', -- rss, x_curated, x_search
    tier INTEGER DEFAULT 2,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Raw news items (fetched from all sources)
CREATE TABLE IF NOT EXISTS news_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id UUID REFERENCES news_sources(id),
    source_name TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    summary TEXT,
    content TEXT,
    image_url TEXT,
    author TEXT,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT now(),
    -- Dedup: unique on normalized title + source
    title_hash TEXT GENERATED ALWAYS AS (md5(lower(regexp_replace(title, '[^a-z0-9]', '', 'g')))) STORED
);

CREATE INDEX IF NOT EXISTS idx_news_items_fetched ON news_items(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_title_hash ON news_items(title_hash);
CREATE INDEX IF NOT EXISTS idx_news_items_source ON news_items(source_name);

-- 3. Curated stories (after AI scoring + dedup)
CREATE TABLE IF NOT EXISTS curated_stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    headline TEXT NOT NULL,
    summary TEXT NOT NULL,
    category TEXT,
    base_score REAL DEFAULT 5,
    final_score REAL DEFAULT 5,
    entities TEXT[] DEFAULT '{}',
    original_url TEXT,
    sources TEXT[] DEFAULT '{}',
    cross_source_count INTEGER DEFAULT 1,
    boosts TEXT[] DEFAULT '{}',
    published_at TIMESTAMPTZ,
    curated_at TIMESTAMPTZ DEFAULT now(),
    -- For batch tracking
    batch_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_curated_stories_score ON curated_stories(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_curated_stories_curated ON curated_stories(curated_at DESC);
CREATE INDEX IF NOT EXISTS idx_curated_stories_batch ON curated_stories(batch_id);

-- 4. X/Twitter curated news (from bird CLI)
CREATE TABLE IF NOT EXISTS x_news (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    x_id TEXT UNIQUE, -- twitter trending ID
    headline TEXT NOT NULL,
    category TEXT,
    post_count INTEGER,
    time_ago TEXT,
    tweets JSONB DEFAULT '[]', -- related tweets
    fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_x_news_fetched ON x_news(fetched_at DESC);

-- 5. Research reports (deep research on selected stories)
CREATE TABLE IF NOT EXISTS research_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID REFERENCES curated_stories(id),
    deep_research TEXT,
    key_points TEXT[] DEFAULT '{}',
    implications TEXT,
    model_used TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Newsletter drafts
CREATE TABLE IF NOT EXISTS newsletter_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hook_title TEXT,
    intro_text TEXT,
    sections JSONB DEFAULT '[]',
    summary TEXT,
    status TEXT DEFAULT 'draft', -- draft, reviewed, published
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Pipeline runs (track automation)
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline TEXT NOT NULL, -- fetch_rss, fetch_x, curate, research, draft
    status TEXT DEFAULT 'running', -- running, completed, failed
    stats JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error TEXT
);

-- Enable RLS but allow service role full access
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Allow anon read access (for the frontend)
CREATE POLICY "Allow anon read" ON news_items FOR SELECT USING (true);
CREATE POLICY "Allow anon read" ON curated_stories FOR SELECT USING (true);
CREATE POLICY "Allow anon read" ON x_news FOR SELECT USING (true);
CREATE POLICY "Allow anon read" ON research_reports FOR SELECT USING (true);
CREATE POLICY "Allow anon read" ON newsletter_drafts FOR SELECT USING (true);
CREATE POLICY "Allow anon read" ON news_sources FOR SELECT USING (true);
CREATE POLICY "Allow anon read" ON pipeline_runs FOR SELECT USING (true);

-- Allow service role full access (for the API routes)
CREATE POLICY "Allow service write" ON news_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write" ON curated_stories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write" ON x_news FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write" ON research_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write" ON newsletter_drafts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write" ON news_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write" ON pipeline_runs FOR ALL USING (true) WITH CHECK (true);

-- Seed the X curated news source
INSERT INTO news_sources (name, url, category, tier, enabled) VALUES
    ('X Curated Crypto', 'x://curated/crypto', 'x_curated', 0, true)
ON CONFLICT DO NOTHING;
