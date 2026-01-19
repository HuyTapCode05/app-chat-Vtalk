@echo off
title Fix Network - VTalk Backend
echo 🔧 Fixing Backend Network Binding...

echo.
echo 📝 Updating backend to bind all interfaces (0.0.0.0)
cd backend

echo.
echo 🔍 Current server.js binding:
findstr "listen" server.js

echo.
echo 📝 Backup and update server.js...
copy server.js server.js.backup 2>nul

echo.
echo 🚀 Starting backend on all interfaces...
node -e "
const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');
content = content.replace(/app\.listen\([^,]+,[^)]*\)/, 'app.listen(PORT, \"0.0.0.0\")');
fs.writeFileSync('server.js', content);
console.log('✅ Backend configured for network access');
"

echo.
echo 🎯 Starting fixed backend...
start "Backend Server" npm start

echo.
echo ✅ Backend should now be accessible from network!
echo    Test: http://192.168.1.3:5000/api/health
echo    Mobile app should connect successfully now

timeout /t 3 /nobreak >nul
exit