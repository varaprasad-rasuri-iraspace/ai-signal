@echo off
echo ========================================
echo AI Signal - Initial Setup
echo ========================================
echo.

REM Check Python version first
echo Checking Python version...
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

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Found Python %PYTHON_VERSION%

REM Check if it's Python 3.13
echo %PYTHON_VERSION% | findstr /C:"3.13" >nul
if not errorlevel 1 (
    echo.
    echo ⚠ WARNING: Python 3.13 detected!
    echo.
    echo Python 3.13 is very new and some packages may fail to install
    echo because they don't have pre-built wheels yet.
    echo.
    echo RECOMMENDED: Use Python 3.11 or 3.12 instead
    echo Download from: https://www.python.org/downloads/
    echo.
    echo If installation fails, you'll need to either:
    echo   1. Install Python 3.11 or 3.12, OR
    echo   2. Install Microsoft C++ Build Tools
    echo.
    set /p continue="Continue with Python 3.13 anyway? (Y/N): "
    if /i not "%continue%"=="Y" (
        echo.
        echo Setup cancelled. Please install Python 3.11 or 3.12
        pause
        exit /b 1
    )
)
echo.

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo .env file created!
    echo IMPORTANT: Please edit .env with your:
    echo   - DATABASE_URL (PostgreSQL/Supabase connection)
    echo   - OPENAI_API_KEY (optional, for AI processing)
    echo   - ANTHROPIC_API_KEY (optional, for AI processing)
    echo.
) else (
    echo .env file already exists, skipping...
    echo.
)

REM Install backend dependencies
echo ========================================
echo Installing Backend Dependencies...
echo ========================================
cd /d "%~dp0backend"
if exist requirements.txt (
    echo Installing Python packages...
    echo This may take a few minutes...
    echo.
    
    REM Use python -m pip instead of pip directly to avoid launcher issues
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    
    if errorlevel 1 (
        echo.
        echo ========================================
        echo ERROR - Failed to install Python packages
        echo ========================================
        echo.
        echo Common solutions
        echo.
        echo 1. If you have multiple Python versions
        echo    - Uninstall Python 3.13 if you don't need it
        echo    - Or use py -3.11 -m pip install -r requirements.txt
        echo.
        echo 2. Try without --user flag
        echo    - python -m pip install -r requirements.txt
        echo.
        echo 3. Use virtual environment (recommended)
        echo    - First run 0-create-venv.bat
        echo    - Then activate it backend\venv\Scripts\activate.bat
        echo    - Then install pip install -r requirements.txt
        echo.
        pause
        exit /b 1
    )
    
    echo.
    echo Backend dependencies installed!
) else (
    echo ERROR: requirements.txt not found in backend folder
)
echo.

REM Install frontend dependencies
echo ========================================
echo Installing Frontend Dependencies...
echo ========================================
cd /d "%~dp0frontend"
if exist package.json (
    node --version >nul 2>&1
    if errorlevel 1 (
        echo ERROR - Node.js is not installed or not in PATH
        echo.
        echo Please install Node.js 18+ from
        echo https://nodejs.org/
        echo.
        pause
        exit /b 1
    )
    
    node --version
    npm --version
    echo.
    echo Installing Node packages...
    echo This may take a few minutes...
    echo.
    call npm install
    
    if errorlevel 1 (
        echo.
        echo ERROR - Failed to install Node packages
        echo.
        echo Try
        echo   1. Delete frontend/node_modules folder
        echo   2. Run this script again
        echo.
        pause
        exit /b 1
    )
    
    echo.
    echo Frontend dependencies installed!
) else (
    echo ERROR: package.json not found in frontend folder
)
echo.

cd /d "%~dp0"
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps
echo 1. Edit .env file with your database URL and API keys
echo 2. Set up your database (run 2-setup-database.bat)
echo 3. Test database connection (run 3-test-connection.bat)
echo 4. Start the application (run 6-run-both.bat)
echo.
pause
