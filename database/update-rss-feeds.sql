-- Update sources with proper RSS feed URLs
-- Run this in Supabase SQL Editor to fix the source URLs

-- Update OpenAI Blog
UPDATE sources 
SET url = 'https://openai.com/blog/rss.xml'
WHERE name = 'OpenAI Blog';

-- Update Anthropic (they have an RSS feed)
UPDATE sources 
SET url = 'https://www.anthropic.com/rss.xml'
WHERE name = 'Anthropic';

-- Update Hacker News (use their RSS feed)
UPDATE sources 
SET url = 'https://hnrss.org/frontpage'
WHERE name = 'Hacker News';

-- Update TechCrunch AI
UPDATE sources 
SET url = 'https://techcrunch.com/tag/artificial-intelligence/feed/'
WHERE name = 'TechCrunch AI';

-- Update MIT Technology Review
UPDATE sources 
SET url = 'https://www.technologyreview.com/feed/'
WHERE name = 'MIT Technology Review';

-- Update VentureBeat AI
UPDATE sources 
SET url = 'https://venturebeat.com/category/ai/feed/'
WHERE name = 'VentureBeat AI';

-- Update arXiv CS AI (use export API RSS)
UPDATE sources 
SET url = 'http://export.arxiv.org/rss/cs.AI'
WHERE name = 'arXiv CS AI';

-- Add new working RSS sources
INSERT INTO sources (name, type, url, reliability_score, fetch_interval_minutes) VALUES
    ('Hugging Face Blog', 'blog', 'https://huggingface.co/blog/feed.xml', 0.90, 60),
    ('The Batch (DeepLearning.AI)', 'newsletter', 'https://www.deeplearning.ai/the-batch/feed/', 0.85, 1440),
    ('AI News (Unite.AI)', 'news', 'https://www.unite.ai/feed/', 0.75, 60),
    ('Machine Learning Reddit', 'social', 'https://www.reddit.com/r/MachineLearning/.rss', 0.70, 30)
ON CONFLICT (url) DO NOTHING;

-- Disable sources without RSS feeds for now
UPDATE sources 
SET is_active = false
WHERE name IN ('Google DeepMind', 'NVIDIA Blog', 'GitHub Trending')
AND url NOT LIKE '%rss%' AND url NOT LIKE '%feed%' AND url NOT LIKE '%atom%';

-- Verify the updates
SELECT name, type, url, is_active, fetch_interval_minutes 
FROM sources 
ORDER BY is_active DESC, fetch_interval_minutes ASC;
