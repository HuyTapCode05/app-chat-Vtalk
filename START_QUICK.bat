@echo off
echo ====================================
echo   VTalk - Quick Start (Web)
echo ====================================
echo.

cd /d %~dp0

echo [1/2] Dang kill process tren port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo [2/2] Dang khoi dong Backend...
start "Backend" cmd /k "cd backend && npm run dev"

timeout /t 5 /nobreak >nul

echo [3/3] Dang khoi dong Mobile (LAN - Tu dong ket noi)...
start "Mobile" cmd /k "cd mobile && npm start -- --lan"

echo.
echo ====================================
echo   Da khoi dong Backend va Mobile!
echo ====================================
echo.
echo Backend: http://localhost:5000
echo Mobile: Dang cho ket noi qua LAN...
echo.
echo 💡 App se tu dong ket noi neu:
echo    - Dien thoai va may tinh cung mang WiFi
echo    - Expo Go app da cai dat
echo    - Mo Expo Go app, no se tu dong ket noi!
echo.
echo Hoac vao Expo Go app va nhap:
echo   exp://[IP]:8081
echo.
echo Nhan phim bat ky de dong...
pause >nul

