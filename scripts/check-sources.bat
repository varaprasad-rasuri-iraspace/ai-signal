@echo off
echo Checking what sources are in the database...
echo.
echo Open this URL in your browser:
echo http://localhost:8000/sources
echo.
echo This will show you all the sources and their URLs.
echo.
echo Look for:
echo - Hacker News URL should be: https://hnrss.org/frontpage
echo - NOT: https://news.ycombinator.com
echo.
pause
start http://localhost:8000/sources
