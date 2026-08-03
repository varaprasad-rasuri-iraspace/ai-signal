@echo off
echo ========================================
echo AI Signal - Python Version Check
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo.
    echo Please install Python 3.11 or 3.12 from:
    echo https://www.python.org/downloads/
    echo.
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

REM Get Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Detected Python version: %PYTHON_VERSION%
echo.

REM Extract major.minor version
for /f "tokens=1,2 delims=." %%a in ("%PYTHON_VERSION%") do (
    set MAJOR=%%a
    set MINOR=%%b
)

REM Check if version is compatible
if "%MAJOR%"=="3" (
    if "%MINOR%"=="11" (
        echo ✓ Python 3.11 detected - Perfect!
        echo   This version has the best package compatibility.
        echo.
        goto :compatible
    )
    if "%MINOR%"=="12" (
        echo ✓ Python 3.12 detected - Good!
        echo   This version should work fine.
        echo.
        goto :compatible
    )
    if "%MINOR%"=="13" (
        echo ⚠ Python 3.13 detected - May have issues!
        echo.
        echo   Python 3.13 is very new and some packages may not have
        echo   pre-built wheels yet. You might encounter build errors.
        echo.
        echo   RECOMMENDED: Install Python 3.11 or 3.12 instead
        echo   Download from: https://www.python.org/downloads/
        echo.
        set /p continue="Continue anyway? (Y/N): "
        if /i not "%continue%"=="Y" (
            echo.
            echo Setup cancelled. Please install Python 3.11 or 3.12
            pause
            exit /b 1
        )
        goto :compatible
    )
    if "%MINOR%"=="10" (
        echo ⚠ Python 3.10 detected - Older version
        echo   Recommended: Python 3.11 or 3.12
        echo   But this should still work.
        echo.
        goto :compatible
    )
)

echo ✗ Python version %PYTHON_VERSION% may not be compatible
echo   Recommended: Python 3.11 or 3.12
echo.
set /p continue="Continue anyway? (Y/N): "
if /i not "%continue%"=="Y" (
    echo.
    echo Setup cancelled.
    pause
    exit /b 1
)

:compatible
echo ========================================
echo Python Check Complete
echo ========================================
echo.
echo Next step: Run 0-setup.bat to install dependencies
echo.
pause
