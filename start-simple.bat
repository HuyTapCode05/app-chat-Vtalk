@echo off
title VTalk - Simple Local Connection
echo 🚀 VTalk - Manual IP Setup
echo ============================

echo 📍 Your current IP addresses:
ipconfig | findstr /i "IPv4"

echo.
echo 🔧 Common IPs to try:
echo   • 192.168.1.3
echo   • 192.168.1.2  
echo   • 192.168.0.3
echo   • 192.168.43.1 (mobile hotspot)

echo.
set /p IP="Enter your IP address (or press Enter for 192.168.1.3): "
if "%IP%"=="" set IP=192.168.1.3

echo.
echo 🔄 Updating configuration with IP: %IP%

powershell -Command "(Get-Content mobile\src\config\api.js) -replace 'const MANUAL_IP = ''[0-9.]+''', 'const MANUAL_IP = ''%IP%''' | Set-Content mobile\src\config\api.js"
powershell -Command "(Get-Content backend\config\config.js) -replace '192\.168\.[0-9]+\.[0-9]+', '%IP%' | Set-Content backend\config\config.js"

echo ✅ Configuration updated!
echo.
echo 📱 Starting services...
start "VTalk Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
start "VTalk Mobile" cmd /k "cd mobile && npx expo start --lan"

echo.
echo ✅ Services started!
echo 📱 Connection info:
echo   • Mobile URL: exp://%IP%:8081
echo   • Backend: http://%IP%:5000
echo   • Web version: http://localhost:19006
echo.
pause