@echo off
echo 🔍 Checking Network IP...
echo ========================

echo Current Network Configuration:
ipconfig | findstr /i "IPv4"

echo.
echo 📱 Expo Metro Info:
echo Check Metro terminal for the correct IP in:
echo "Metro waiting on exp+vtalk://expo-development-client/?url=http%%3A%%2F%%2F[IP_HERE]%%3A8081"

echo.
echo 🌐 If QR scan fails, try:
echo 1. Make sure phone and computer on same WiFi
echo 2. Update IP in mobile/src/config/api.js 
echo 3. Restart Metro with: npm start --clear

pause