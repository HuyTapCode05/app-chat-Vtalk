const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get local network IP address
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return '127.0.0.1';
}

/**
 * Update IP in app.config.js (for manual update if needed)
 * Note: app.config.js now auto-detects IP, so this script is optional
 */
function updateIP() {
  const localIP = getLocalIP();
  const configPath = path.join(__dirname, '../mobile/app.config.js');
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ Không tìm thấy app.config.js');
    process.exit(1);
  }
  
  let content = fs.readFileSync(configPath, 'utf8');
  
  // Replace hardcoded IP in DEFAULT_API_URL and DEFAULT_SOCKET_URL if they exist
  // This is for backward compatibility
  const oldIPPattern = /http:\/\/[\d.]+:5000/g;
  const newIP = `http://${localIP}:5000`;
  
  if (content.match(oldIPPattern)) {
    content = content.replace(oldIPPattern, newIP);
    fs.writeFileSync(configPath, content, 'utf8');
    console.log(`✅ Đã cập nhật IP thành ${localIP} trong app.config.js`);
  } else {
    console.log(`ℹ️  app.config.js đã tự động detect IP (${localIP})`);
  }
  
  console.log(`   IP hiện tại: ${localIP}`);
  console.log(`   API_URL: ${newIP}/api`);
  console.log(`   SOCKET_URL: ${newIP}`);
}

// Show current IP
const localIP = getLocalIP();
console.log(`📍 IP hiện tại: ${localIP}\n`);

// Update if run directly
if (require.main === module) {
  updateIP();
}

module.exports = { getLocalIP, updateIP };

