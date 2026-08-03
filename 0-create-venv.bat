@echo off
echo ========================================
echo AI Signal - Create Virtual Environment
echo ========================================
echo.

cd /d "%~dp0backend"

REM Check if venv already exists
if exist venv (
    echo Virtual environment already exists!
    set /p recreate="Do you want to recreate it? (Y/N): "
    if /i not "%recreate%"=="Y" (
        echo Keeping existing virtual environment.
        echo.
        pause
        exit /b 0
    )
    echo Removing old virtual environment...
    rmdir /s /q venv
    echo.
)

echo Creating Python virtual environment...
REM Try py -3.11 first (for systems with multiple Python versions)
py -3.11 -m venv venv

if errorlevel 1 (
    echo py -3.11 not found, trying python command...
    python -m venv venv
    
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to create virtual environment
        echo Make sure Python 3.11+ is installed and in your PATH
        echo.
        pause
        exit /b 1
    )
)

echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ========================================
echo Virtual Environment Created!
echo ========================================
echo.
echo To activate it manually in the future:
echo   cd backend
echo   venv\Scripts\activate.bat
echo.
echo The 4-run-backend.bat script will automatically use this venv.
echo.
pause
