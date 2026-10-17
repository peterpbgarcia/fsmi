
@echo off
setlocal
title Compendio di Preghiere - Local Server

cd /d "%~dp0"

echo Starting local server...

start "HTTP Server" cmd /k "cd /d ""%~dp0"" && npx http-server -p 8080 -c-1"

echo.
echo Waiting for the server to respond...

set "URL=http://localhost:8080"
set /a ATTEMPTS=0

:WAIT_SERVER
curl.exe --silent --fail --output NUL "%URL%"
if not errorlevel 1 goto SERVER_READY

set /a ATTEMPTS+=1
if %ATTEMPTS% GEQ 60 goto SERVER_TIMEOUT

timeout /t 1 /nobreak >nul
goto WAIT_SERVER

:SERVER_READY
echo.
echo Server is ready!
echo Opening Brave in Incognito mode...

set "BRAVE=%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"

if not exist "%BRAVE%" set "BRAVE=%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe"

if not exist "%BRAVE%" set "BRAVE=%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"

if exist "%BRAVE%" (
    start "" "%BRAVE%" --incognito "%URL%"
) else (
    echo Brave was not found in the usual installation folders.
    echo Please edit this BAT file and set the correct path to brave.exe.
    pause
)

goto END

:SERVER_TIMEOUT
echo.
echo ERROR: The server did not respond within 60 seconds.
echo Check the HTTP Server window for errors.
pause
goto END

:END
endlocal
