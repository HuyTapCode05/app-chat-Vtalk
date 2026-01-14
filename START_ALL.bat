@echo off
echo ====================================
echo   VTalk - Start All
echo ====================================
echo.

cd /d %~dp0

echo Chon che do:
echo [1] Start Backend + Mobile (Web) - Nhanh [MAC DINH]
echo [2] Start Backend + Mobile (LAN) - Tu dong ket noi, khong can quet QR
echo [3] Start Backend + Mobile (Dev Client) - Co WebRTC
echo [4] Rebuild App (WebRTC) - Lan dau tien
echo [5] Cancel
echo.
set /p mode="Nhap lua chon (1-5, Enter = 1): "

if "%mode%"=="" set mode=1
if "%mode%"=="1" goto start_web
if "%mode%"=="2" goto start_lan
if "%mode%"=="3" goto start_dev_client
if "%mode%"=="4" goto rebuild
if "%mode%"=="5" goto end
goto start_web

:start_web
echo.
echo [1/3] Dang kill process tren port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo [2/3] Dang khoi dong Backend...
start "Backend" cmd /k "cd backend && npm run dev"

timeout /t 5 /nobreak >nul

echo [3/3] Dang khoi dong Mobile (Web)...
start "Mobile" cmd /k "cd mobile && npm start -- --web"

echo.
echo ====================================
echo   Da khoi dong Backend va Mobile!
echo ====================================
echo.
echo Backend: http://localhost:5000
echo Mobile: http://localhost:19006
echo.
echo ⚠️  WebRTC se KHONG hoat dong trong che do Web!
echo    De co WebRTC, chon option [2] hoac [3]
goto end

:start_lan
echo.
echo [1/3] Dang kill process tren port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo [2/3] Dang khoi dong Backend...
start "Backend" cmd /k "cd backend && npm run dev"

timeout /t 5 /nobreak >nul

echo [3/3] Dang khoi dong Mobile (LAN - Tu dong ket noi)...
start "Mobile LAN" cmd /k "cd mobile && npm start -- --lan"

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
echo.
echo Hoac vao Expo Go app va nhap:
echo   exp://[IP]:8081
echo.
goto end

:start_dev_client
echo.
echo [1/4] Dang kill process tren port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo [2/4] Dang khoi dong Backend...
start "Backend" cmd /k "cd backend && npm run dev"

timeout /t 5 /nobreak >nul

echo [3/4] Kiem tra dependencies...
cd mobile
if not exist "node_modules" (
    echo    Dang cai dependencies...
    call npm install
)
cd ..

echo [4/4] Dang khoi dong Mobile (Dev Client)...
start "Mobile" cmd /k "cd mobile && npx expo start --dev-client"

echo.
echo ====================================
echo   Da khoi dong Backend va Mobile!
echo ====================================
echo.
echo Backend: http://localhost:5000
echo Mobile Dev Client: Dang cho...
echo.
echo ⚠️  CAN THIET: App phai duoc build voi expo-dev-client!
echo    Neu chua build, chay: REBUILD_APP.bat
echo    Hoac chon option [3] trong menu nay
goto end

:rebuild
echo.
echo ====================================
echo   Rebuild App (WebRTC)
echo ====================================
echo.
echo Chon platform:
echo [1] Android
echo [2] iOS (chi tren macOS)
echo [3] Cancel
echo.
set /p platform="Nhap lua chon (1-3): "

if "%platform%"=="1" goto rebuild_android
if "%platform%"=="2" goto rebuild_ios
if "%platform%"=="3" goto end
goto end

:rebuild_android
echo.
echo [1/4] Dang kiem tra Android setup...
call CHECK_ANDROID.bat
if errorlevel 1 (
    echo ❌ Android setup check failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Chon cach build:
echo [1] Build va chay tren device/emulator (can device)
echo [2] Build APK de cai thu cong (khong can device)
echo [3] Cancel
echo.
set /p build_choice="Nhap lua chon (1-3): "

if "%build_choice%"=="1" goto rebuild_android_device
if "%build_choice%"=="2" goto rebuild_android_apk
if "%build_choice%"=="3" goto end
goto end

:rebuild_android_device
echo.
echo [1/3] Dang prebuild Android...
cd mobile
call npx expo prebuild --platform android --clean
if errorlevel 1 (
    echo ❌ Prebuild failed!
    cd ..
    pause
    exit /b 1
)

echo.
echo [2/3] Dang build Android (co the mat 5-10 phut)...
echo ⚠️  Can co Android device hoac emulator dang chay!
call npx expo run:android
if errorlevel 1 (
    echo ❌ Build failed!
    echo.
    echo 💡 Neu khong co device, chay: CHECK_ANDROID.bat
    echo    Hoac chon option [2] de build APK
    cd ..
    pause
    exit /b 1
)

echo.
echo ✅ Build thanh cong!
echo.
echo [3/3] Dang khoi dong dev server...
cd ..
start "Mobile Dev" cmd /k "cd mobile && npx expo start --dev-client"
goto end

:rebuild_android_apk
echo.
echo [1/3] Dang prebuild Android...
cd mobile
call npx expo prebuild --platform android --clean
if errorlevel 1 (
    echo ❌ Prebuild failed!
    cd ..
    pause
    exit /b 1
)

echo.
echo [2/3] Dang build APK (co the mat 5-10 phut)...
cd android
call gradlew.bat assembleRelease
if errorlevel 1 (
    echo ❌ Build failed!
    cd ..\..
    pause
    exit /b 1
)

echo.
echo ✅ APK built successfully!
echo.
echo 📦 APK location: mobile\android\app\build\outputs\apk\release\app-release.apk
echo.
echo 💡 Huong dan cai APK:
echo    1. Chuyen APK vao dien thoai
echo    2. Bat "Install from unknown sources" trong settings
echo    3. Cai APK
echo.
echo [3/3] Dang khoi dong dev server...
cd ..\..
start "Mobile Dev" cmd /k "cd mobile && npx expo start --dev-client"
goto end

:rebuild_ios
echo.
echo [1/3] Dang prebuild iOS...
cd mobile
call npx expo prebuild --platform ios --clean
if errorlevel 1 (
    echo ❌ Prebuild failed!
    cd ..
    pause
    exit /b 1
)

echo.
echo [2/3] Dang build iOS (co the mat 5-10 phut)...
call npx expo run:ios
if errorlevel 1 (
    echo ❌ Build failed!
    cd ..
    pause
    exit /b 1
)

echo.
echo ✅ Build thanh cong!
echo.
echo [3/3] Dang khoi dong dev server...
cd ..
start "Mobile Dev" cmd /k "cd mobile && npx expo start --dev-client"
goto end

:end
cd /d %~dp0
echo.
echo Nhan phim bat ky de dong...
pause >nul

