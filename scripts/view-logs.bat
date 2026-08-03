@echo off
echo ========================================
echo AI Signal - View Logs
echo ========================================
echo.

set logfile=logs\ai-signal.log
set errorfile=logs\ai-signal-errors.log

:menu
echo What would you like to view?
echo.
echo 1. All logs
echo 2. Error logs only
echo 3. Last 50 lines (all logs)
echo 4. Last 50 lines (errors only)
echo 5. Follow logs in real-time (all)
echo 6. Follow error logs in real-time
echo 7. Clear logs
echo 8. Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto viewall
if "%choice%"=="2" goto viewerrors
if "%choice%"=="3" goto tail50
if "%choice%"=="4" goto tailerrors
if "%choice%"=="5" goto follow
if "%choice%"=="6" goto followerrors
if "%choice%"=="7" goto clearlogs
if "%choice%"=="8" goto end
goto menu

:viewall
echo.
echo ========================================
echo Viewing: %logfile%
echo ========================================
echo.
if exist "%logfile%" (
    type "%logfile%"
) else (
    echo Log file not found: %logfile%
    echo The backend may not have been started yet.
)
echo.
pause
goto menu

:viewerrors
echo.
echo ========================================
echo Viewing: %errorfile%
echo ========================================
echo.
if exist "%errorfile%" (
    type "%errorfile%"
) else (
    echo Error log file not found: %errorfile%
    echo Either no errors occurred, or the backend hasn't been started.
)
echo.
pause
goto menu

:tail50
echo.
echo ========================================
echo Last 50 lines: %logfile%
echo ========================================
echo.
if exist "%logfile%" (
    powershell -Command "Get-Content '%logfile%' -Tail 50"
) else (
    echo Log file not found: %logfile%
)
echo.
pause
goto menu

:tailerrors
echo.
echo ========================================
echo Last 50 lines: %errorfile%
echo ========================================
echo.
if exist "%errorfile%" (
    powershell -Command "Get-Content '%errorfile%' -Tail 50"
) else (
    echo Error log file not found: %errorfile%
)
echo.
pause
goto menu

:follow
echo.
echo ========================================
echo Following: %logfile%
echo Press Ctrl+C to stop
echo ========================================
echo.
if exist "%logfile%" (
    powershell -Command "Get-Content '%logfile%' -Wait -Tail 20"
) else (
    echo Log file not found: %logfile%
    pause
)
goto menu

:followerrors
echo.
echo ========================================
echo Following: %errorfile%
echo Press Ctrl+C to stop
echo ========================================
echo.
if exist "%errorfile%" (
    powershell -Command "Get-Content '%errorfile%' -Wait -Tail 20"
) else (
    echo Error log file not found: %errorfile%
    pause
)
goto menu

:clearlogs
echo.
echo ========================================
echo Clear Logs
echo ========================================
echo.
echo This will delete all log files.
set /p confirm="Are you sure? (Y/N): "
if /i "%confirm%"=="Y" (
    del /q logs\*.log 2>nul
    echo.
    echo ✓ All log files deleted
) else (
    echo.
    echo Cancelled
)
echo.
pause
goto menu

:end
echo.
echo Goodbye!
