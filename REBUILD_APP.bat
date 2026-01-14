@echo off
echo ====================================
echo   VTalk - Rebuild App (WebRTC)
echo ====================================
echo.
echo ⚠️  LƯU Ý: Rebuild app để WebRTC hoạt động!
echo    - Không thể dùng Expo Go sau khi rebuild
echo    - Phải dùng development build
echo.
echo Chon platform:
echo [1] Android
echo [2] iOS (chỉ trên macOS)
echo [3] Cancel
echo.
set /p choice="Nhap lua chon (1-3): "

if "%choice%"=="1" goto android
if "%choice%"=="2" goto ios
if "%choice%"=="3" goto end
goto end

:android
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

if "%build_choice%"=="1" goto android_device
if "%build_choice%"=="2" goto android_apk
if "%build_choice%"=="3" goto end
goto end

:android_device
echo.
echo [1/3] Dang prebuild...
cd mobile
call npx expo prebuild --platform android --clean
if errorlevel 1 (
    echo ❌ Prebuild failed!
    cd ..
    pause
    exit /b 1
)

echo.
echo [2/3] Dang build Android...
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
echo [3/3] Sau khi app chay, chay: npx expo start --dev-client
cd ..
goto end

:android_apk
echo.
echo [1/3] Dang prebuild...
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
echo    4. Chay: npx expo start --dev-client
cd ..\..
goto end

:ios
echo.
echo [1/3] Dang prebuild...
cd mobile
call npx expo prebuild --platform ios
if errorlevel 1 (
    echo ❌ Prebuild failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Dang build iOS...
call npx expo run:ios
if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo ✅ Build thanh cong!
echo.
echo Sau khi app chay, chay: npx expo start --dev-client
goto end

:end
cd /d %~dp0
pause

