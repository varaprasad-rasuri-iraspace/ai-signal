-- =============================================================================
-- ⚠️  CAUTION: DATA MODIFICATION SCRIPT ⚠️
-- CLEANUP OLD DATA & LIST ALL SOURCES
-- Run in Supabase SQL Editor to clean up and verify sources
-- =============================================================================

-- STEP 1: Delete old events (older than 30 days)
-- This keeps database lean and fresh
-- ⚠️ WARNING: This will permanently delete events older than 30 days
DELETE FROM events
WHERE published_at < NOW() - INTERVAL '30 days';

-- Show how many events were deleted
-- SELECT 'Deleted old events' as action, COUNT(*) as rows_affected FROM events WHERE published_at < NOW() - INTERVAL '30 days';

-- STEP 2: Reset event relationships that reference deleted events
DELETE FROM event_relationships 
WHERE source_event_id NOT IN (SELECT id FROM events)
   OR target_event_id NOT IN (SELECT id FROM events);

-- STEP 3: Reset ingestion logs older than 7 days (optional cleanup)
-- DELETE FROM ingestion_logs 
-- WHERE started_at < NOW() - INTERVAL '7 days';

-- =============================================================================
-- LIST ALL ACTIVE SOURCES
-- =============================================================================

-- Show all active sources grouped by type
SELECT 
    type,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as sources_list
FROM sources 
WHERE is_active = true 
GROUP BY type 
ORDER BY type;

-- Detailed list of active sources
SELECT 
    name,
    type,
    reliability_score,
    fetch_interval_minutes,
    CASE 
        WHEN fetch_interval_minutes <= 5 THEN '🔥 Real-time'
        WHEN fetch_interval_minutes <= 15 THEN '⚡ Fast'
        WHEN fetch_interval_minutes <= 30 THEN '📱 Regular'
        ELSE '📦 Slow'
    END as priority
FROM sources 
WHERE is_active = true 
ORDER BY fetch_interval_minutes ASC, reliability_score DESC;

-- =============================================================================
-- STATISTICS
-- =============================================================================

-- Event counts by source
SELECT 
    s.name as source_name,
    COUNT(e.id) as event_count,
    MAX(e.published_at) as last_event
FROM sources s
LEFT JOIN events e ON s.id = e.source_id
GROUP BY s.id, s.name
ORDER BY event_count DESC
LIMIT 20;

-- Total events in last 15 days
SELECT 
    COUNT(*) as events_last_15_days
FROM events 
WHERE published_at >= NOW() - INTERVAL '15 days';

-- Total events today
SELECT 
    COUNT(*) as events_today
FROM events 
WHERE published_at >= CURRENT_DATE;

-- =============================================================================
-- DISABLE BAD SOURCES (Optional)
-- If any source has 0 events for 30 days, disable it
-- =============================================================================

UPDATE sources s
SET is_active = false
WHERE s.id IN (
    SELECT s2.id
    FROM sources s2
    LEFT JOIN events e ON s2.id = e.source_id AND e.published_at >= NOW() - INTERVAL '30 days'
    WHERE e.id IS NULL AND s2.is_active = true
);

-- =============================================================================
-- SUMMARY
-- =============================================================================

SELECT 
    'Sources' as metric, COUNT(*)::text as value FROM sources WHERE is_active = true
UNION ALL
SELECT 
    'Active Sources', COUNT(*)::text FROM sources WHERE is_active = true
UNION ALL
SELECT 
    'Total Events', COUNT(*)::text FROM events
UNION ALL
SELECT 
    'Events (15 days)', COUNT(*)::text FROM events WHERE published_at >= NOW() - INTERVAL '15 days'
UNION ALL
SELECT 
    'Events Today', COUNT(*)::text FROM events WHERE published_at >= CURRENT_DATE;
