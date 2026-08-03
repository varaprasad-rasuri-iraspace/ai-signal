-- Additional Curated AI Sources
-- Run this in Supabase SQL Editor to add more high-quality sources

-- Company/Research Blogs (High Reliability)
INSERT INTO sources (name, type, url, reliability_score, fetch_interval_minutes) VALUES
    ('Google AI Blog', 'blog', 'https://blog.google/technology/ai/rss/', 0.95, 30),
    ('Microsoft Research', 'research', 'https://www.microsoft.com/en-us/research/feed/', 0.90, 60),
    ('AWS Machine Learning', 'blog', 'https://aws.amazon.com/blogs/machine-learning/feed/', 0.85, 60)
ON CONFLICT (url) DO NOTHING;

-- AI News & Analysis (Medium-High Reliability)
INSERT INTO sources (name, type, url, reliability_score, fetch_interval_minutes) VALUES
    ('Wired AI', 'news', 'https://www.wired.com/feed/tag/ai/latest/rss', 0.80, 60)
ON CONFLICT (url) DO NOTHING;

-- Product & Startup News (Medium Reliability)
INSERT INTO sources (name, type, url, reliability_score, fetch_interval_minutes) VALUES
    ('Product Hunt AI', 'product', 'https://www.producthunt.com/topics/artificial-intelligence/posts.rss', 0.75, 60),
    ('AI Alignment Forum', 'research', 'https://www.alignmentforum.org/feed.xml', 0.85, 120)
ON CONFLICT (url) DO NOTHING;

-- Verify the sources
SELECT name, type, reliability_score FROM sources ORDER BY name;

-- Count total sources
SELECT COUNT(*) as total_sources FROM sources;
