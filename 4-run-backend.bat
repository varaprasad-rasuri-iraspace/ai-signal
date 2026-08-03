@echo off
echo ========================================
echo AI Signal - Starting Backend Server
echo ========================================
echo.

cd /d "%~dp0backend"

REM Check if .env exists
if not exist "%~dp0.env" (
    echo ERROR: .env file not found!
    echo Please run 0-setup.bat first and configure your .env file
    echo.
    pause
    exit /b 1
)

REM Check if virtual environment exists
if exist venv (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
    echo.
)

echo Starting FastAPI backend server...
echo Backend will be available at: http://localhost:8000
echo API docs will be available at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
