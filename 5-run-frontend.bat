@echo off
echo ========================================
echo AI Signal - Starting Frontend Server
echo ========================================
echo.

cd /d "%~dp0frontend"

REM Check if node_modules exists
if not exist node_modules (
    echo ERROR: node_modules not found!
    echo Please run 0-setup.bat first to install dependencies
    echo.
    pause
    exit /b 1
)

echo Starting Next.js frontend server...
echo Frontend will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the development server
call npm run dev

pause
