@echo off
echo ========================================
echo AI Signal - Cleanup (Keep .env)
echo ========================================
echo.
echo This will remove:
echo - node_modules (frontend dependencies)
echo - Python virtual environment (venv)
echo - Python cache files (__pycache__)
echo - Build artifacts (.next, dist)
echo - Log files
echo.
echo This will KEEP:
echo - .env file (your configuration)
echo.
echo WARNING: You will need to reinstall dependencies after cleanup!
echo.
pause

echo.
echo Starting cleanup...
echo.

REM Remove frontend node_modules
if exist "frontend\node_modules" (
    echo Removing frontend\node_modules...
    rmdir /s /q "frontend\node_modules"
    echo Done!
) else (
    echo frontend\node_modules not found, skipping...
)

REM Remove frontend build artifacts
if exist "frontend\.next" (
    echo Removing frontend\.next...
    rmdir /s /q "frontend\.next"
    echo Done!
) else (
    echo frontend\.next not found, skipping...
)

REM Remove Python virtual environment
if exist "venv" (
    echo Removing venv...
    rmdir /s /q "venv"
    echo Done!
) else (
    echo venv not found, skipping...
)

REM Remove Python cache files
echo Removing Python __pycache__ directories...
for /d /r . %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d"
echo Done!

REM Remove .pyc files
echo Removing .pyc files...
del /s /q *.pyc 2>nul
echo Done!

REM Remove log files
if exist "logs" (
    echo Removing log files...
    del /q "logs\*.log" 2>nul
    echo Done!
) else (
    echo logs directory not found, skipping...
)

echo.
echo ========================================
echo Cleanup Complete!
echo ========================================
echo.
echo The following were removed:
echo - node_modules
echo - venv
echo - __pycache__ directories
echo - .pyc files
echo - .next build directory
echo - log files
echo.
echo Your .env file was KEPT.
echo.
echo To set up again:
echo 1. Run 0-create-venv.bat
echo 2. Run 1-setup.bat
echo.
pause
