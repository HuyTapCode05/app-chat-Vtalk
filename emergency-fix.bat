@echo off
title VTalk Emergency Fix
echo 🆘 VTalk Emergency Fix - Registration Issues
echo ============================================

echo.
echo 🔧 Step 1: Fixing CORS issue...
powershell -Command "(Get-Content backend\config\config.js) -replace 'http://!IP: =!', 'http://192.168.1.3' | Set-Content backend\config\config.js"

echo.
echo 🔧 Step 2: Fixing mobile API config...
powershell -Command "(Get-Content mobile\src\config\api.js) -replace '!IP: =!', '192.168.1.3' | Set-Content mobile\src\config\api.js"

echo.
echo 🔧 Step 3: Adding wildcard CORS for debug...
powershell -Command "(Get-Content backend\config\config.js) -replace '],', ', ''*''],' | Set-Content backend\config\config.js"

echo.
echo ✅ Emergency fixes applied!
echo.
echo 🚀 Starting services...
start "VTalk Backend FIXED" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
start "VTalk Mobile FIXED" cmd /k "cd mobile && npx expo start --lan"

echo.
echo ✅ Services restarted with fixes!
echo 📱 Try registration again
echo 🔍 Check console logs for any remaining errors
pause