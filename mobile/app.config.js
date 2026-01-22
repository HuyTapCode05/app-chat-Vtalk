require('dotenv').config();

module.exports = {
  expo: {
    name: "VTalk",
    extra: {
      API_URL: process.env.API_URL || 'http://192.168.1.13:5000/api',
      SOCKET_URL: process.env.SOCKET_URL || 'http://192.168.1.13:5000',
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
