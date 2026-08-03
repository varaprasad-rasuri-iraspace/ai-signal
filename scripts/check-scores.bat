@echo off
echo Checking current score status...
echo.
echo Stats:
curl -s http://localhost:8000/feed/stats | findstr "avg_importance_score"
echo.
echo.
echo Sample events (first 5):
curl -s "http://localhost:8000/feed/latest?limit=5"
echo.
pause
