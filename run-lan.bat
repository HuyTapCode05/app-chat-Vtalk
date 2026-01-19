@echo off
title VTalk - LAN Mode (Simple Connection)
echo 🚀 VTalk - Starting with LAN Mode
echo ==================================
echo 🌐 Simple local network connection

echo.
echo 📄 Starting Backend Server...
start "VTalk Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo 📱 Starting Mobile App with LAN mode...
start "VTalk Mobile LAN" cmd /k "cd mobile && npx expo start --lan"

echo.
echo ✅ Services started!
echo 🌐 LAN mode - works on local network
echo 📱 Look for URL in terminal like: exp://192.168.x.x:8081
echo.
echo 📋 Connection methods:
echo   1. Type URL manually in Expo Go: exp://192.168.x.x:8081
echo   2. Or open http://localhost:19006 in browser (web version)
echo   3. Or connect via USB and use: npx expo start --localhost
echo.
pause