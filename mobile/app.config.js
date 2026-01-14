module.exports = {
  expo: {
    name: "VTalk",
    slug: "vtalk",
    scheme: "vtalk",
    version: "1.0.0",
    sdkVersion: "54.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#00B14F"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.vtalk.app",
      infoPlist: {
        NSCameraUsageDescription: "Ứng dụng cần truy cập camera để thực hiện cuộc gọi video.",
        NSMicrophoneUsageDescription: "Ứng dụng cần truy cập micro để thực hiện cuộc gọi âm thanh và video."
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#00B14F"
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
      "expo-dev-client"
    ],
    extra: {
      eas: {
        projectId: "your-project-id"
      }
    }
  }
};
