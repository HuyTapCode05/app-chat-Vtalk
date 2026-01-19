@echo off
title Network Debug - VTalk
echo 🔍 VTalk Network Debug
echo ====================

echo.
echo 📍 Step 1: Checking your IP addresses
ipconfig | findstr /i "IPv4"

echo.
echo 🔍 Step 2: Testing localhost backend
curl -s http://localhost:5000/api/health 2>nul && (
    echo ✅ Backend accessible on localhost
) || (
    echo ❌ Backend NOT accessible on localhost - Start backend first!
)

echo.
echo 🔍 Step 3: Testing network IP backend  
curl -s http://192.168.1.3:5000/api/health 2>nul && (
    echo ✅ Backend accessible on network IP
) || (
    echo ❌ Backend NOT accessible on network IP - Need to fix binding
)

echo.
echo 🔧 Step 4: Solutions
echo   1. If localhost works: Use web version (http://localhost:19006)
echo   2. If network IP fails: Backend needs to bind 0.0.0.0 not localhost
echo   3. Try mobile tunnel mode: npx expo start --tunnel

echo.
echo 📋 Quick commands:
echo   • Web version: run-web.bat
echo   • Tunnel mode: run-tunnel.bat  
echo   • Fix network: fix-network.bat

pause