@echo off
echo ========================================
echo AI Signal - Fix Importance Scores
echo ========================================
echo.
echo This script will recalculate importance scores for all events.
echo.
echo Step 1: Checking if backend is running...
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo ERROR: Backend is not running!
    echo Please start the backend first using 4-run-backend.bat
    pause
    exit /b 1
)
echo Backend is running!
echo.

echo Step 2: Recalculating scores for all events...
curl -X POST "http://localhost:8000/events/recalculate-scores?limit=1000"
echo.
echo.

echo Step 3: Checking stats...
curl -s http://localhost:8000/feed/stats
echo.
echo.

echo ========================================
echo Done! Refresh your browser to see the updated scores.
echo ========================================
pause
