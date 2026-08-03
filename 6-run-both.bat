@echo off
echo ========================================
echo AI Signal - Starting Both Servers
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo ERROR: .env file not found!
    echo Please run 0-setup.bat first and configure your .env file
    echo.
    pause
    exit /b 1
)

echo Starting backend and frontend servers...
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C in either window to stop that server
echo.

REM Start backend in new window
start "AI Signal - Backend" cmd /k "%~dp04-run-backend.bat"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "AI Signal - Frontend" cmd /k "%~dp05-run-frontend.bat"

echo.
echo Both servers are starting in separate windows...
echo.
pause
