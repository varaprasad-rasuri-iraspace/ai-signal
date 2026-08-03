@echo off
echo ========================================
echo Reprocess All Events
echo ========================================
echo.
echo This will:
echo - Add categories to all events
echo - Extract and assign tags
echo - Recalculate importance scores
echo.
pause

cd /d "%~dp0.."

REM Check if virtual environment exists
if exist "backend\venv\Scripts\activate.bat" (
    echo Using virtual environment...
    call backend\venv\Scripts\activate.bat
)

echo.
echo Running reprocessing script...
python scripts\reprocess-events.py

echo.
echo ========================================
echo Done! Check the output above.
echo ========================================
pause
