# 📱 Chat Application - React Native

A modern, feature-rich mobile chat application built with React Native, supporting real-time messaging, voice/video calls, and group conversations.

## ✨ Features

### 🔧 Core Functionality
- **Real-time Messaging** - Instant messaging with Socket.IO integration
- **Voice & Video Calls** - WebRTC-powered voice and video calling
- **Group Chat** - Create and manage group conversations
- **Contact Management** - Add and manage contacts
- **User Authentication** - Secure login/registration system
- **Profile Management** - Customizable user profiles

### 🎨 User Experience
- **Emoji Reactions** - Quick emoji reactions to messages
- **Message Menus** - Context menus for message actions
- **Empty States** - Intuitive empty state designs
- **Loading States** - Smooth loading animations
- **Error Handling** - Comprehensive error boundary system

### 🔧 Technical Features
- **Offline Support** - Local caching and storage
- **Performance Optimization** - Optimized rendering and memory usage
- **Push Notifications** - Real-time notification system
- **Input Validation** - Form validation and error handling
- **Security** - Secure authentication and data handling

## 🛠️ Tech Stack

### Frontend (Mobile)
- **React Native** - Cross-platform mobile development
- **React Navigation** - Navigation library
- **Socket.IO Client** - Real-time communication
- **WebRTC** - Voice and video calling
- **AsyncStorage** - Local data storage

### Development Tools
- **Metro** - React Native bundler
- **Babel** - JavaScript compiler
- **Android Gradle** - Android build system
- **ESLint** - Code linting
- **React DevTools** - Development debugging

## 📱 Screenshots

*Screenshots will be added soon...*

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development - macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fe-be
   ```

2. **Install dependencies**
   ```bash
   cd mobile
   npm install
   ```

3. **Android Setup**
   ```bash
   # Run on Android
   npm run android
   # or
   npx react-native run-android
   ```

4. **iOS Setup** (macOS only)
   ```bash
   # Install iOS dependencies
   cd ios && pod install && cd ..
   
   # Run on iOS
   npm run ios
   # or
   npx react-native run-ios
   ```

### Quick Start Scripts

The project includes convenient batch scripts for Windows users:

- `START_ALL.bat` - Start all services
- `START_QUICK.bat` - Quick start for development
- `REBUILD_APP.bat` - Full rebuild
- `QUICK_REBUILD.bat` - Quick rebuild

## 🏗️ Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ChatMenu.js
│   │   ├── EmojiPicker.js
│   │   ├── LoadingSpinner.js
│   │   └── ...
│   ├── screens/            # Screen components
│   │   ├── ChatScreen.js
│   │   ├── LoginScreen.js
│   │   ├── ProfileScreen.js
│   │   └── ...
│   ├── context/            # React Context providers
│   │   ├── AuthContext.js
│   │   └── SocketContext.js
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   └── config/             # Configuration files
├── android/                # Android-specific code
├── ios/                    # iOS-specific code (if applicable)
└── assets/                 # Static assets
```

## 📚 Documentation

- [Build APK Guide](BUILD_APK_GUIDE.md) - Instructions for building APK
- [Feature Checklist](CHECKLIST_CHUC_NANG.md) - Complete feature list
- [Code Quality Improvements](CODE_QUALITY_IMPROVEMENTS.md) - Code quality guidelines
- [New Features](TINH_NANG_MOI.md) - Latest feature additions
- [Running APK Guide](HUONG_DAN_CHAY_APK.md) - APK installation guide

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Guidelines

- Follow React Native best practices
- Use meaningful commit messages
- Write clean, documented code
- Test your changes thoroughly
- Update documentation as needed

## 🐛 Known Issues & Troubleshooting

- Check the build logs if encountering compilation issues
- Ensure all dependencies are properly installed
- Verify Android SDK and development environment setup
- Clear Metro cache if experiencing bundling issues: `npx react-native start --reset-cache`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Development Team - Initial work and ongoing development

## 🙏 Acknowledgments

- React Native community for excellent documentation
- Socket.IO for real-time communication
- WebRTC for voice/video calling capabilities
- All contributors and testers

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Made with ❤️ using React Native**