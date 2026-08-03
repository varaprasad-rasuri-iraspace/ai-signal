@echo off
echo ========================================
echo Update RSS Feed URLs
echo ========================================
echo.
echo This will show you the SQL to update source URLs with proper RSS feeds.
echo.
echo INSTRUCTIONS:
echo 1. Go to your Supabase project dashboard
echo 2. Click on "SQL Editor" in the left sidebar
echo 3. Click "New Query"
echo 4. Copy the SQL from: database\update-rss-feeds.sql
echo 5. Paste it into the SQL Editor
echo 6. Click "Run" to execute
echo.
echo This will:
echo   - Update existing sources with proper RSS feed URLs
echo   - Add new working RSS sources (Hugging Face, Unite.AI, etc.)
echo   - Disable sources without RSS feeds
echo.
echo After updating, restart the backend (run 4-run-backend.bat)
echo to trigger a fresh data ingestion with the new RSS feeds.
echo.
echo ========================================
echo Opening SQL file...
echo ========================================
echo.

type database\update-rss-feeds.sql

echo.
echo ========================================
echo Copy the SQL above and run it in Supabase SQL Editor
echo ========================================
echo.
pause
