@echo off
setlocal enabledelayedexpansion
echo 🔍 Auto-detecting your IP address...
echo ========================================

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr "192.168"') do (
    set "IP=%%a"
    set "IP=!IP: =!"
    goto :found
)

:found
if not defined IP (
    echo ❌ Could not detect IP. Using default: 192.168.1.3
    set "IP=192.168.1.3"
)

echo 📍 Found IP: %IP%

echo.
echo 🔧 Updating mobile app configuration...
powershell -Command "(Get-Content mobile\src\config\api.js) -replace 'const MANUAL_IP = ''[0-9.]+''', 'const MANUAL_IP = ''%IP%''' | Set-Content mobile\src\config\api.js"

echo.
echo 🔧 Updating backend CORS configuration...
powershell -Command "(Get-Content backend\config\config.js) -replace '192\.168\.[0-9]+\.[0-9]+', '%IP%' | Set-Content backend\config\config.js"

echo.
echo ✅ IP updated to: %IP%
echo 📱 Now run: run-all.bat
pause