require('dotenv').config();

// Auto-detect local IP address
function getLocalIP() {
  const os = require('os');
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

const LOCAL_IP = process.env.LOCAL_IP || getLocalIP();
const DEFAULT_API_URL = `http://${LOCAL_IP}:5000/api`;
const DEFAULT_SOCKET_URL = `http://${LOCAL_IP}:5000`;

module.exports = {
  expo: {
    name: "VTalk",
    extra: {
      API_URL: process.env.API_URL || DEFAULT_API_URL,
      SOCKET_URL: process.env.SOCKET_URL || DEFAULT_SOCKET_URL,
      EXPO_PROJECT_ID: process.env.EXPO_PROJECT_ID || 'vtalk-demo-project',
    },
    slug: "vtalk",
    scheme: "vtalk",
    projectId: "vtalk-demo-project",
    // Deep linking configuration
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "vtalk",
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
    version: "1.0.0",
    sdkVersion: "54.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#00B14F"
    },
    icon: "./assets/icon.png",
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      icon: "./assets/icon.png",
      supportsTablet: true,
      bundleIdentifier: "com.vtalk.app",
      infoPlist: {
        NSCameraUsageDescription: "Ứng dụng cần truy cập camera để thực hiện cuộc gọi video.",
        NSMicrophoneUsageDescription: "Ứng dụng cần truy cập micro để thực hiện cuộc gọi âm thanh và video."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#00B14F",
        monochromeImage: "./assets/adaptive-icon.png"
      },
      package: "com.vtalk.app",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ]
    },
    plugins: [
      "expo-asset",
      "expo-audio",
      "expo-dev-client",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#00B14F",
          sounds: ["./assets/notification-sound.wav"],
        }
      ]
    ],
    notification: {
      icon: "./assets/notification-icon.png",
      color: "#00B14F",
      iosDisplayInForeground: true,
      androidMode: "default",
    }
  }
};
