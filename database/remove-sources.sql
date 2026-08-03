-- Keep Only Selected Sources (Safe Version - Handles All FK Constraints)
-- Run this in Supabase SQL Editor → Dashboard → SQL Editor

-- Step 1: First, let's see what sources exist
SELECT name, url FROM sources ORDER BY name;

-- Step 2: Find IDs of sources to delete
DO $$
DECLARE
    unwanted_source_ids UUID[];
BEGIN
    -- Get IDs of sources to delete
    SELECT ARRAY_AGG(id) INTO unwanted_source_ids
    FROM sources 
    WHERE name NOT IN (
        'OpenAI Blog',
        'Google DeepMind',
        'Anthropic',
        'NVIDIA Blog',
        'arXiv CS AI',
        'Hacker News',
        'GitHub Trending',
        'MIT Technology Review',
        'Google AI Blog',
        'Microsoft Research',
        'AWS Machine Learning',
        'Wired AI',
        'Product Hunt AI',
        'AI Alignment Forum'
    );
    
    -- Step 3: Clear source_id in events (FK constraint)
    UPDATE events SET source_id = NULL WHERE source_id = ANY(unwanted_source_ids);
    
    -- Step 4: Clear source_id in ingestion_logs (FK constraint)
    UPDATE ingestion_logs SET source_id = NULL WHERE source_id = ANY(unwanted_source_ids);
    
    -- Step 5: Now safe to delete the sources
    DELETE FROM sources WHERE id = ANY(unwanted_source_ids);
    
    RAISE NOTICE 'Cleanup complete! Removed sources with IDs: %', unwanted_source_ids;
END $$;

-- Step 6: Verify remaining sources
SELECT name, type, reliability_score FROM sources ORDER BY name;

-- Step 7: Count remaining sources
SELECT COUNT(*) as remaining_sources FROM sources;
