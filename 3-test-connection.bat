@echo off
echo ========================================
echo AI Signal - Test Database Connection
echo ========================================
echo.

cd /d "%~dp0"

REM Check if .env exists
if not exist ".env" (
    echo ERROR: .env file not found!
    echo Please run 1-setup.bat first and configure your .env file
    echo.
    pause
    exit /b 1
)

echo Step 1: Validating DATABASE_URL format...
echo ========================================
python scripts\test\validate-database-url.py
if errorlevel 1 (
    echo.
    echo ========================================
    echo DATABASE_URL validation failed!
    echo Please fix the errors above before testing connection.
    echo.
    echo For help, run: check-supabase-pooler.bat
    echo Or read: SUPABASE-IPV4-FIX.md
    echo ========================================
    echo.
    pause
    exit /b 1
)

echo.
echo Step 2: Testing actual database connection...
echo ========================================
echo.

cd backend

REM Activate venv if it exists
if exist venv (
    call venv\Scripts\activate.bat
)

REM Create a simple test script
echo import asyncio > test_db.py
echo from app.database import engine >> test_db.py
echo from sqlalchemy import text >> test_db.py
echo. >> test_db.py
echo async def test(): >> test_db.py
echo     try: >> test_db.py
echo         async with engine.connect() as conn: >> test_db.py
echo             result = await conn.execute(text("SELECT 1")) >> test_db.py
echo             print("✓ Database connection successful!") >> test_db.py
echo             print("✓ Database is responding correctly") >> test_db.py
echo     except Exception as e: >> test_db.py
echo         print(f"✗ Database connection failed: {e}") >> test_db.py
echo. >> test_db.py
echo asyncio.run(test()) >> test_db.py

python test_db.py

REM Clean up
del test_db.py

cd ..

echo.
echo ========================================
echo.
echo If the connection failed, check:
echo   1. DATABASE_URL in .env is correct
echo   2. Session Pooler is enabled in Supabase (run check-supabase-pooler.bat)
echo   3. Database server is running
echo   4. Firewall allows the connection
echo.
pause
