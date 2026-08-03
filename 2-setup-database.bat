@echo off
echo ========================================
echo AI Signal - Database Setup Helper
echo ========================================
echo.

echo This script will help you set up your database.
echo.
echo You have two options:
echo.
echo Option 1: Supabase (Recommended - Free tier available)
echo   1. Go to https://supabase.com and create an account
echo   2. Create a new project
echo   3. Go to SQL Editor
echo   4. Copy and paste the contents of database/supabase-setup.sql
echo   5. Click "Run" to execute the SQL
echo   6. Go to Settings -^> Database to get your connection string
echo   7. Update DATABASE_URL in your .env file
echo.
echo Option 2: Local PostgreSQL
echo   1. Install PostgreSQL from https://www.postgresql.org/download/
echo   2. Open pgAdmin or psql
echo   3. Run the SQL from database/schema.sql
echo   4. Update DATABASE_URL in your .env file
echo.
echo ========================================
echo.

set /p choice="Would you like to open the database setup files? (Y/N): "
if /i "%choice%"=="Y" (
    echo.
    echo Opening database setup files...
    start notepad "%~dp0database\supabase-setup.sql"
    start notepad "%~dp0.env"
    echo.
    echo Files opened! Follow the instructions above.
) else (
    echo.
    echo Skipping file opening. You can find the files at:
    echo   - database/supabase-setup.sql
    echo   - .env
)

echo.
echo After setting up your database, run:
echo   3-test-connection.bat to verify the connection
echo   6-run-both.bat to start both servers
echo.
pause
