@echo off
echo ====================================
echo   VTalk - Quick Rebuild (WebRTC)
echo ====================================
echo.
echo ⚠️  LƯU Ý: 
echo    - Rebuild app để WebRTC hoạt động
echo    - Không thể dùng Expo Go sau khi rebuild
echo    - Phải dùng development build
echo.
echo Chon cach build:
echo [1] Build va chay tren device/emulator (can device)
echo [2] Build APK de cai thu cong (khong can device)
echo [3] Cancel
echo.
set /p choice="Nhap lua chon (1-3): "

if "%choice%"=="1" goto device
if "%choice%"=="2" goto apk
if "%choice%"=="3" goto end
goto end

:device
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
echo [2/3] Dang build va chay tren device...
echo ⚠️  Can co Android device hoac emulator dang chay!
call npx expo run:android
if errorlevel 1 (
    echo ❌ Build failed!
    echo.
    echo 💡 Neu khong co device, chon option [2] de build APK
    cd ..
    pause
    exit /b 1
)

echo.
echo ✅ Build thanh cong!
echo.
echo [3/3] Sau khi app chay, chay: npx expo start --dev-client
cd ..
goto end

:apk
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
echo 💡 Huong dan:
echo    1. Chuyen APK vao dien thoai
echo    2. Bat "Install from unknown sources" trong settings
echo    3. Cai APK
echo    4. Chay: cd mobile && npx expo start --dev-client
echo    5. Mo app va quet QR code
cd ..\..
goto end

:end
cd /d %~dp0
pause

