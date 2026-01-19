@echo off
title Stop VTalk Services
echo 🛑 Stopping VTalk Services...
echo ==============================

echo Stopping Node.js processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im "VTalk Backend" 2>nul  
taskkill /f /im "VTalk Mobile" 2>nul

echo.
echo ✅ All VTalk services stopped!
timeout /t 2 /nobreak >nul