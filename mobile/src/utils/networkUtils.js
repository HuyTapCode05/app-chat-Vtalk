const { networkInterfaces } = require('os');

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal (127.x.x.x) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();
console.log(`🌐 Detected Local IP: ${LOCAL_IP}`);

module.exports = {
  LOCAL_IP,
  getLocalIP
};