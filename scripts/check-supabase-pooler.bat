@echo off
echo ========================================
echo Supabase Session Pooler Setup Check
echo ========================================
echo.
echo Your Supabase project: [Check your Supabase dashboard]
echo.
echo For detailed instructions, see: docs\SUPABASE-IPV4-FIX.md
echo.
echo ========================================
echo STEP 1: Enable Session Pooler
echo ========================================
echo.
echo 1. Open your browser and go to:
echo    https://supabase.com/dashboard (navigate to your project)
echo    Then go to: Settings -^> Database
echo.
echo 2. Scroll down to "Connection Pooling" section
echo.
echo 3. Find "Session Pooler" and click "Enable" if not already enabled
echo.
echo 4. Copy the connection string that looks like:
echo    postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres
echo.
echo ========================================
echo STEP 2: Update .env File
echo ========================================
echo.
echo Open .env file and update DATABASE_URL with:
echo.
echo postgresql+asyncpg://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres
echo.
echo Replace PROJECT_REF, YOUR_PASSWORD, and REGION with your actual values
echo (e.g., us-east-1, us-west-1, eu-west-1, ap-southeast-1)
echo.
echo ========================================
echo STEP 3: Test Connection
echo ========================================
echo.
echo After updating .env, run:
echo    3-test-connection.bat
echo.
echo ========================================
echo.
echo Press any key to open Supabase dashboard in browser...
pause >nul
start https://supabase.com/dashboard
