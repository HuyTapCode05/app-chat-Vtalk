const os = require('os');

/**
 * Get local network IP address
 * Returns the first non-internal IPv4 address
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  // Fallback to localhost
  return '127.0.0.1';
}

const localIP = getLocalIP();
console.log(localIP);

module.exports = { getLocalIP };

