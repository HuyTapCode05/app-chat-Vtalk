@echo off
title VTalk Development Environment
echo 🚀 VTalk - Starting Backend and Mobile...
echo ========================================

echo.
echo 📄 Starting Backend Server...
start "VTalk Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo 📱 Starting Mobile App...
start "VTalk Mobile" cmd /k "cd mobile && npm start"

echo.
echo ✅ Both services started!
echo 📄 Backend: http://localhost:5000
echo 📱 Mobile: Check Expo terminal
echo.
pause