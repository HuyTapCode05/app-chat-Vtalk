@echo off
title VTalk - Tunnel Mode (No QR needed)
echo 🚀 VTalk - Starting with Tunnel Mode
echo =====================================
echo 🌐 This will work without QR scanning!

echo.
echo 📄 Starting Backend Server...
start "VTalk Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo 📱 Starting Mobile App with Tunnel...
start "VTalk Mobile Tunnel" cmd /k "cd mobile && npx expo start --tunnel"

echo.
echo ✅ Services started!
echo 🌐 Tunnel mode - works anywhere, no IP issues
echo 📱 Use the tunnel URL in your phone's Expo Go
echo.
echo 📋 Alternative connections:
echo   • Copy URL from terminal to Expo Go app
echo   • Or type exp://[tunnel-url] in browser
echo.
pause