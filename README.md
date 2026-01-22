# 📱 VTalk - Full Stack Chat Application

A modern, feature-rich chat application with React Native mobile app and Node.js backend, supporting real-time messaging, voice/video calls, and group conversations.

## ✨ Features

### 🔧 Core Functionality
- **Real-time Messaging** - Instant messaging with Socket.IO integration
- **Voice & Video Calls** - WebRTC-powered voice and video calling
- **Group Chat** - Create and manage group conversations
- **Contact Management** - Add and manage contacts
- **User Authentication** - Secure JWT-based authentication
- **Profile Management** - Customizable user profiles
- **File Sharing** - Upload and share images, documents
- **Message Reactions** - React to messages with emojis
- **Block/Unblock Users** - User privacy controls
- **Close Friends** - Special friend categorization
- **Pinned Messages** - Pin important messages
- **Nicknames** - Custom display names for contacts

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
- **File Upload** - Multer-based file handling
- **Email Service** - Automated email notifications

## 🛠️ Tech Stack

### Frontend (Mobile)
- **React Native** - Cross-platform mobile development
- **React Navigation** - Navigation library
- **Socket.IO Client** - Real-time communication
- **WebRTC** - Voice and video calling
- **AsyncStorage** - Local data storage
- **Expo** - React Native toolchain

### Backend (Server)
- **Node.js** - Server runtime
- **Express.js** - Web application framework
- **Socket.IO** - Real-time bidirectional communication
- **SQLite** - Lightweight database
- **JWT** - JSON Web Tokens for authentication
- **Multer** - File upload middleware
- **Nodemailer** - Email service
- **bcrypt** - Password hashing

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
- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **React Native CLI**
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HuyTapCode05/app-chat-Vtalk.git
   cd app-chat-Vtalk
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   
   # Create .env file with your configuration
   cp .env.example .env  # Edit with your settings
   
   # Start backend server
   npm start
   ```

3. **Setup Mobile App**
   ```bash
   cd ../mobile
   npm install
   
   # For Android
   npm run android
   # or
   npx react-native run-android
   
   # For iOS (macOS only)
   cd ios && pod install && cd ..
   npm run ios
   # or
   npx react-native run-ios
   ```

### Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
DB_PATH=./database/vtalk.db
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
UPLOAD_PATH=./uploads
```

## 🏗️ Project Structure

```
├── backend/                 # Node.js Backend
│   ├── config/             # Configuration files
│   ├── database/           # Database setup
│   ├── middleware/         # Express middleware
│   ├── routes/            # API routes
│   ├── socket/            # Socket.IO handlers
│   ├── storage/           # Database storage utilities
│   ├── utils/             # Utility functions
│   ├── uploads/           # File uploads
│   ├── .env               # Environment variables
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
├── mobile/                 # React Native Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # Screen components
│   │   ├── context/        # React Context providers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── config/         # Configuration files
│   ├── android/            # Android-specific code
│   ├── ios/               # iOS-specific code (if applicable)
│   └── package.json       # Frontend dependencies
├── README.md              # Project documentation
├── LICENSE               # MIT License
└── .gitignore           # Git ignore rules
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify-token` - Verify JWT token

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/search` - Search users

### Messages
- `GET /api/messages/:conversationId` - Get conversation messages
- `POST /api/messages` - Send message
- `DELETE /api/messages/:messageId` - Delete message

### Conversations
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create new conversation
- `PUT /api/conversations/:id` - Update conversation

### Socket Events
- `connection` - Client connected
- `join_room` - Join conversation room
- `send_message` - Send real-time message
- `typing` - Typing indicator
- `call_request` - Voice/Video call request
- `call_response` - Call response

## 📱 App Icon Setup

Để setup icon cho app khi build, xem [ICON_SETUP.md](mobile/ICON_SETUP.md)

## 📚 Documentation

- [Build APK Guide](BUILD_APK_GUIDE.md) - Instructions for building APK
- [Feature Checklist](CHECKLIST_CHUC_NANG.md) - Complete feature list
- [Code Quality Improvements](CODE_QUALITY_IMPROVEMENTS.md) - Code quality guidelines
- [New Features](TINH_NANG_MOI.md) - Latest feature additions
- [Running APK Guide](HUONG_DAN_CHAY_APK.md) - APK installation guide
- **[🚀 Optimizations](OPTIMIZATIONS.md)** - Complete list of all optimizations performed
- **[🔒 Security Features](SECURITY_FEATURES.md)** - Security & family safety features
- **[📈 Scalability Optimizations](SCALABILITY_OPTIMIZATIONS.md)** - Optimizations for handling many concurrent users
- **[⚡ Client & Backend Optimizations](CLIENT_BACKEND_OPTIMIZATIONS.md)** - Client and backend performance optimizations
- **[🎯 Advanced Optimizations](ADVANCED_OPTIMIZATIONS.md)** - Advanced image processing, caching, and batching optimizations
- **[🏁 Final Optimizations](FINAL_OPTIMIZATIONS.md)** - Retry handlers, error recovery, performance monitoring, and database optimization

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