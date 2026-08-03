-- HOT TRENDING AI SOURCES UPDATE
-- Curated sources for real-time AI/tech news, funding, and trending topics
-- Run this in Supabase SQL Editor to update data sources

-- Disable old/dead sources first
UPDATE sources SET is_active = false WHERE url IN (
    'https://openai.com/blog',
    'https://deepmind.google/blog',
    'https://www.technologyreview.com/feed/topic/artificial-intelligence/',
    'https://blogs.nvidia.com'
);

-- =============================================================================
-- REAL-TIME HOT NEWS SOURCES (Highest Priority) - UPDATED TO 5-10 MIN
-- =============================================================================
INSERT INTO sources (name, type, url, reliability_score, fetch_interval_minutes) VALUES
    -- Major AI Company Blogs (Official, High Reliability)
    ('OpenAI News', 'blog', 'https://openai.com/news/rss/', 0.95, 5),
    ('Anthropic News', 'blog', 'https://www.anthropic.com/news/rss/', 0.95, 5),
    ('Google DeepMind News', 'blog', 'https://deepmind.google/news/rss/', 0.95, 5),
    ('Meta AI News', 'blog', 'https://ai.meta.com/blog/rss/', 0.90, 10),
    ('xAI News', 'blog', 'https://x.ai/blog/rss', 0.90, 10),
    ('Microsoft AI Blog', 'blog', 'https://azure.microsoft.com/en-us/blog/tag/artificial-intelligence/feed/', 0.90, 10),
    ('Amazon AI Blog', 'blog', 'https://aws.amazon.com/blogs/machine-learning/feed/', 0.85, 15),
    ('Apple Machine Learning', 'blog', 'https://machinelearning.apple.com/feed.xml', 0.90, 15),
    
    -- NVIDIA AI (for GPU/Compute news)
    ('NVIDIA AI Blog', 'blog', 'https://blogs.nvidia.com/blog/category/deep-learning/feed/', 0.90, 10),
    
    -- AI Research Labs
    ('Mistral AI Blog', 'blog', 'https://mistral.ai/news/rss/', 0.85, 10),
    ('Cohere Blog', 'blog', 'https://cohere.com/blog/rss.xml', 0.85, 10),
    ('Stability AI News', 'blog', 'https://stability.ai/news/rss', 0.80, 15),
    
    -- Hugging Face (Open Source Hub)
    ('Hugging Face Blog', 'research', 'https://huggingface.co/blog/feed.xml', 0.90, 10)
ON CONFLICT (url) DO NOTHING;

-- =============================================================================
-- HOT TRENDING TECH NEWS (Aggregated AI Coverage) - 5-10 MIN
-- =============================================================================
INSERT INTO sources (name, type, url, reliability_score, fetch_interval_minutes) VALUES
    -- TechCrunch AI (Funding, Startups, Products) - BREAKING NEWS
    ('TechCrunch AI', 'news', 'https://techcrunch.com/category/artificial-intelligence/feed/', 0.85, 5),
    
    -- VentureBeat AI (Industry Analysis)
    ('VentureBeat AI', 'news', 'https://venturebeat.com/category/ai/feed/', 0.80, 5),
    
    -- The Verge AI (Consumer Tech + AI)
    ('The Verge AI', 'news', 'https://www.theverge.com/rss/artificial-intelligence/index.xml', 0.80, 5),
    
    -- Wired AI (In-depth Analysis)
    ('Wired AI', 'news', 'https://www.wired.com/feed/tag/ai/latest/rss', 0.80, 10),
    
    -- Ars Technica AI
    ('Ars Technica AI', 'news', 'https://feeds.arstechnica.com/arstechnica/index/tags/id/ai/feed', 0.80, 10),
    
    -- MIT Technology Review (Research + Analysis)
    ('MIT Tech Review', 'news', 'https://www.technologyreview.com/feed/', 0.85, 15),
    
    -- The Information AI
    ('The Information AI', 'news', 'https://www.theinformation.com/feed', 0.85, 15),
    
    -- Reuters AI - BREAKING NEWS
    ('Reuters AI', 'news', 'https://feeds.reuters.com/reuters/technologyNews?format=xml', 0.85, 5),
    
    -- Bloomberg AI - BREAKING NEWS
    ('Bloomberg AI', 'news', 'https://feeds.bloomberg.com/technology/news.rss', 0.85, 5)
ON CONFLICT (url) DO NOTHING;

-- =============================================================================
-- TRENDING TOPICS / SOCIAL - 5-10 MIN (Fast moving!)
-- =============================================================================
INSERT INTO sources (name, type, url, reliability_score, fetch_interval_minutes) VALUES
    -- Hacker News (Developer Community - Hot Discussions)
    ('Hacker News', 'social', 'https://hnrss.org/frontpage', 0.75, 5),
    ('Hacker News AI', 'social', 'https://hnrss.org/tagged/ai', 0.75, 5),
    
    -- Reddit Machine Learning (Trending in ML community)
    ('Reddit ML', 'social', 'https://www.reddit.com/r/MachineLearning/.rss', 0.70, 5),
    ('Reddit AI Art', 'social', 'https://www.reddit.com/r/StableDiffusion/.rss', 0.65, 5),
    ('Reddit ChatGPT', 'social', 'https://www.reddit.com/r/ChatGPT/.rss', 0.70, 5),
    
    -- Lobste.rs (Tech-savvy community)
    ('Lobsters AI', 'social', 'https://lobste.rs/t/ai.rss', 0.70, 5)
ON CONFLICT (url) DO NOTHING;

-- =============================================================================
-- RESEARCH HOT PAPERS - 15-30 MIN
-- =============================================================================
INSERT INTO sources (name, type, url, reliability_score, fetch_interval_minutes) VALUES
    -- arXiv AI Papers (Fresh research)
    ('arXiv AI', 'research', 'http://export.arxiv.org/rss/cs.AI', 0.85, 15),
    ('arXiv ML', 'research', 'http://export.arxiv.org/rss/cs.LG', 0.85, 15),
    ('arXiv NLP', 'research', 'http://export.arxiv.org/rss/cs.CL', 0.85, 15),
    ('arXiv CV', 'research', 'http://export.arxiv.org/rss/cs.CV', 0.85, 15),
    ('arXiv Robotics', 'research', 'http://export.arxiv.org/rss/cs.RO', 0.80, 15),
    
    -- Papers with Code (Trending papers with implementations)
    ('Papers with Code', 'research', 'https://paperswithcode.com/feed/', 0.80, 30)
ON CONFLICT (url) DO NOTHING;

-- =============================================================================
-- FUNDING & STARTUP NEWS - 15-30 MIN
-- =============================================================================
INSERT INTO sources (name, type, url, reliability_score, fetch_interval_minutes) VALUES
    -- Product Hunt (New AI Products/Launches)
    ('Product Hunt AI', 'product', 'https://www.producthunt.com/topics/artificial-intelligence/posts.rss', 0.75, 10),
    
    -- Funding/Investment News
    ('CB Insights AI', 'news', 'https://www.cbinsights.com/research/feed', 0.80, 15),
    
    -- Dealroom (European Tech Funding)
    ('Dealroom AI', 'news', 'https://dealroom.co/feed', 0.75, 15)
ON CONFLICT (url) DO NOTHING;

-- =============================================================================
-- AI NEWSLETTERS & AGGREGATORS - 30-60 MIN
-- =============================================================================
INSERT INTO sources (name, type, url, reliability_score, fetch_interval_minutes) VALUES
    -- DeepLearning.AI The Batch (Weekly digest)
    ('The Batch', 'newsletter', 'https://www.deeplearning.ai/the-batch/feed/', 0.85, 60),
    
    -- Last Week in AI (Aggregator)
    ('Last Week in AI', 'newsletter', 'https://lastweekin.ai/feed', 0.80, 60),
    
    -- The Algorithm (MIT)
    ('MIT Algorithm', 'newsletter', 'https://www.technologyreview.com/feed/topic/artificial-intelligence/', 0.85, 60),
    
    -- Unite.AI (AI News Aggregator)
    ('Unite.AI', 'news', 'https://www.unite.ai/feed/', 0.75, 15)
ON CONFLICT (url) DO NOTHING;

-- =============================================================================
-- BENCHMARKS & EVALUATIONS
-- =============================================================================
INSERT INTO sources (name, type, url, reliability_score, fetch_interval_minutes) VALUES
    -- LMSYS Chatbot Arena (LLM Leaderboard)
    ('LMSYS Leaderboard', 'research', 'https://chat.lmsys.org/blog/', 0.85, 360),
    
    -- OpenCompass (MLPerf-style benchmarks)
    ('OpenCompass', 'research', 'https://opencompass.org.cn/home', 0.80, 360)
ON CONFLICT (url) DO NOTHING;

-- =============================================================================
-- VERIFY & SUMMARY
-- =============================================================================

-- Show all active sources grouped by type
SELECT 
    type,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as sources
FROM sources 
WHERE is_active = true 
GROUP BY type 
ORDER BY type;

-- Total active sources
SELECT COUNT(*) as active_sources FROM sources WHERE is_active = true;

-- Sources by fetch priority (15 min = real-time)
SELECT name, fetch_interval_minutes, reliability_score 
FROM sources 
WHERE is_active = true 
ORDER BY fetch_interval_minutes ASC 
LIMIT 20;
