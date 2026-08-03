@echo off
echo Recalculating importance scores for all events...
curl -X POST "http://localhost:8000/events/recalculate-scores?limit=1000"
echo.
echo Done! Check the response above for results.
pause
