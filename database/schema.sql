-- AI Signal Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Sources table
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- research, news, blog, github, social
    url VARCHAR(500) NOT NULL UNIQUE,
    reliability_score DECIMAL(3,2) DEFAULT 0.5,
    fetch_interval_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    content TEXT,
    url VARCHAR(500) NOT NULL UNIQUE,
    image_url VARCHAR(500),
    source_id UUID REFERENCES sources(id),
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    category VARCHAR(50), -- research, product, funding, announcement, tool
    importance_score DECIMAL(5,2) DEFAULT 0.0,
    sentiment_score DECIMAL(3,2), -- -1 to 1
    raw_payload JSONB,
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event tags junction table
CREATE TABLE event_tags (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, tag_id)
);

-- Event relationships table
CREATE TABLE event_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    target_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50), -- related, cites, follows, competitor, funding
    weight DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_event_id, target_event_id, relationship_type)
);

-- Users table (for future authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user', -- user, admin
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100),
    rate_limit INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ingestion logs
CREATE TABLE ingestion_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES sources(id),
    status VARCHAR(20), -- success, failed, partial
    items_fetched INTEGER DEFAULT 0,
    items_added INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_events_published_at ON events(published_at DESC);
CREATE INDEX idx_events_importance_score ON events(importance_score DESC);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_source_id ON events(source_id);
CREATE INDEX idx_events_is_processed ON events(is_processed);
CREATE INDEX idx_events_title_gin ON events USING gin(to_tsvector('english', title));
CREATE INDEX idx_events_summary_gin ON events USING gin(to_tsvector('english', COALESCE(summary, '')));

CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_slug ON tags(slug);

CREATE INDEX idx_event_relationships_source ON event_relationships(source_event_id);
CREATE INDEX idx_event_relationships_target ON event_relationships(target_event_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default sources (13 curated sources)
INSERT INTO sources (name, type, url, reliability_score, fetch_interval_minutes) VALUES
    ('OpenAI Blog', 'blog', 'https://openai.com/blog', 0.95, 30),
    ('Google DeepMind', 'blog', 'https://deepmind.google/blog', 0.95, 30),
    ('Anthropic', 'blog', 'https://www.anthropic.com/blog', 0.95, 30),
    ('NVIDIA Blog', 'blog', 'https://blogs.nvidia.com', 0.90, 60),
    ('arXiv CS AI', 'research', 'https://arxiv.org/list/cs.AI/recent', 0.85, 60),
    ('Hacker News', 'social', 'https://news.ycombinator.com', 0.70, 15),
    ('GitHub Trending', 'github', 'https://github.com/trending', 0.75, 30),
    ('MIT Technology Review', 'news', 'https://www.technologyreview.com/feed/topic/artificial-intelligence/', 0.85, 60)
ON CONFLICT (url) DO NOTHING;

-- Insert default tags
INSERT INTO tags (name, slug, category) VALUES
    ('Large Language Models', 'large-language-models', 'model'),
    ('Computer Vision', 'computer-vision', 'model'),
    ('Reinforcement Learning', 'reinforcement-learning', 'model'),
    ('Robotics', 'robotics', 'application'),
    ('Healthcare AI', 'healthcare-ai', 'application'),
    ('Autonomous Vehicles', 'autonomous-vehicles', 'application'),
    ('GPT', 'gpt', 'brand'),
    ('Claude', 'claude', 'brand'),
    ('Gemini', 'gemini', 'brand'),
    ('Llama', 'llama', 'brand'),
    ('Funding', 'funding', 'business'),
    ('Acquisition', 'acquisition', 'business'),
    ('Partnership', 'partnership', 'business'),
    ('Research Paper', 'research-paper', 'content'),
    ('Product Launch', 'product-launch', 'content'),
    ('Open Source', 'open-source', 'content'),
    ('API', 'api', 'technology'),
    ('GPU', 'gpu', 'technology'),
    ('Edge AI', 'edge-ai', 'technology'),
    ('Multimodal', 'multimodal', 'technology')
ON CONFLICT (slug) DO NOTHING;
