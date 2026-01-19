@echo off
title VTalk Web Version
echo 🌐 Starting VTalk Web Version
echo ========================

echo.
echo 🔧 This runs everything on localhost - no network issues!
echo.

echo 📱 Starting mobile in web mode...
cd mobile
start "Mobile Web" cmd /k "npx expo start --web --port 19006"

echo.
echo ⏳ Waiting for web server...
timeout /t 5 /nobreak >nul

echo.
echo 🖥️ Starting backend...
cd ..\backend
start "Backend" cmd /k "npm start"

echo.
echo ⏳ Waiting for backend...
timeout /t 3 /nobreak >nul

echo.
echo 🎉 VTalk Web Version Started!
echo    📱 Mobile App: http://localhost:19006  
echo    🔧 Backend: http://localhost:5000/api
echo.
echo 💡 Use this for testing without network issues!
echo    Registration and all features work normally.

start http://localhost:19006
pause