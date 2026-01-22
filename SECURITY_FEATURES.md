# 🔒 VTalk - Security & Family Safety Features

Tài liệu này mô tả các tính năng bảo mật và an toàn gia đình đã được implement.

---

## 🔐 Socket Authentication Middleware

### Mục đích
- Ngăn chặn unauthorized access vào rooms
- Verify JWT token trước khi cho phép join conversation/user rooms
- Bảo vệ trẻ em khỏi strangers

### Implementation
- **File**: `backend/middleware/socketAuth.js`
- **Middleware**: `io.use(socketAuth)` - Verify token từ `socket.handshake.auth.token`
- **Functions**:
  - `verifyConversationMember()` - Check user là member của conversation
  - `verifyUserRoomAccess()` - Check user có quyền access user room (own hoặc friend)

### Client Integration
- Client phải gửi token trong socket connection:
```javascript
const socket = io(SOCKET_URL, {
  auth: {
    token: userToken
  }
});
```

### Security Benefits
- ✅ Không thể join conversation nếu không phải member
- ✅ Không thể access user room nếu không phải friend
- ✅ Prevent room hacking (ai biết ID cũng không join được)

---

## 📱 Push Notifications

### Mục đích
- Notify users khi offline có tin nhắn mới
- Notify incoming calls khi app đóng
- Real-time notifications cho family members

### Implementation

#### Mobile (`mobile/src/services/notificationService.js`)
- Register Expo push token
- Send local notifications
- Handle notification taps
- Badge count management

#### Backend (`backend/utils/pushNotification.js`)
- Send notifications via Expo Push API
- Batch notifications support
- Message và call notifications

#### Database
- `user_push_tokens` table để lưu tokens
- Support multiple devices per user

### Usage
```javascript
// Register token
const token = await notificationService.registerForPushNotifications();

// Save to backend
await api.post('/api/push-tokens', { expoPushToken: token, platform: 'ios' });
```

### Features
- ✅ Offline message notifications
- ✅ Incoming call notifications
- ✅ Background/quit state support
- ✅ Multiple devices support

---

## 📦 Offline-First + Background Sync

### Mục đích
- Chat được khi mạng yếu/mất mạng
- Auto sync khi reconnect
- Queue messages khi offline

### Implementation
- **File**: `mobile/src/utils/offlineQueue.js`
- **Storage**: AsyncStorage
- **Queue**: Messages được queue khi offline, sync khi online

### Features
- ✅ Queue messages khi offline
- ✅ Auto sync khi reconnect
- ✅ Local storage với AsyncStorage
- ✅ Sync listeners

### Usage
```javascript
// Add message to queue
await offlineQueue.addMessage(message);

// Setup sync listener
offlineQueue.onSync((queuedMessages) => {
  // Send queued messages
  queuedMessages.forEach(msg => sendMessage(msg));
});
```

---

## 👨‍👩‍👧‍👦 Parental Controls

### Mục đích
- Bảo vệ trẻ em khỏi strangers
- Content filtering
- Screen time limits
- Activity monitoring

### Implementation

#### Mobile (`mobile/src/utils/parentalControls.js`)
- Contact approval requirement
- Content filter với keyword blocking
- Screen time limits (e.g., 22:00 - 07:00)
- Settings persistence

#### Backend (`backend/routes/parental.js`)
- Contact approval API
- Activity log API
- Parent dashboard

#### Database
- `contact_approvals` table
- `activity_logs` table

### Features
- ✅ **Contact Approval**: Parent phải approve trước khi add contact
- ✅ **Content Filter**: Block sensitive keywords
- ✅ **Screen Time**: Giới hạn thời gian sử dụng
- ✅ **Activity Log**: Parent xem activity của child

### Usage
```javascript
// Check if approval required
if (parentalControls.requiresApproval()) {
  // Request approval from parent
}

// Filter content
const { filtered, hasSensitive } = parentalControls.filterContent(text);

// Check screen time
const { isAllowed, message } = parentalControls.getScreenTimeStatus();
```

---

## 🔐 End-to-End Encryption (E2E)

### Mục đích
- Bảo vệ privacy của messages
- COPPA/GDPR-friendly
- Secure communication

### Implementation
- **File**: `mobile/src/utils/encryption.js`
- **Library**: crypto-js (cần install)
- **Key Management**: Per-conversation keys

### Features
- ✅ AES encryption cho messages
- ✅ Per-conversation keys
- ✅ Key storage trong AsyncStorage
- ✅ Auto encrypt/decrypt

### Usage
```javascript
// Encrypt message
const encrypted = await encryptionManager.encryptMessage(
  message,
  conversationId,
  otherUserId,
  currentUserId
);

// Decrypt message
const decrypted = await encryptionManager.decryptMessage(
  encryptedMessage,
  conversationId,
  otherUserId,
  currentUserId
);
```

### Note
- Cần install `crypto-js`: `npm install crypto-js`
- Keys được generate từ user IDs
- Keys được lưu local (không gửi lên server)

---

## 🔗 Deep Linking

### Mục đích
- Share conversation links
- Open app đến conversation cụ thể
- Better UX cho family sharing

### Implementation
- **File**: `mobile/src/utils/deepLinking.js`
- **Scheme**: `vtalk://`
- **Formats**:
  - `vtalk://chat/{conversationId}`
  - `vtalk://user/{userId}`

### Configuration
- **app.config.js**: Scheme và intent filters đã được config

### Usage
```javascript
// Generate link
const link = generateConversationLink(conversationId, conversationName);

// Setup deep linking
setupDeepLinking(navigation);
```

---

## 📱 App Icons & Splash Screen

### Configuration
- **app.config.js** đã được config:
  - Icon: `./assets/icon.png` (1024x1024)
  - Splash: `./assets/splash.png`
  - Adaptive icon: `./assets/adaptive-icon.png`
  - Notification icon: `./assets/notification-icon.png`

### Note
- Cần tạo các file assets:
  - `mobile/assets/icon.png` (1024x1024)
  - `mobile/assets/splash.png`
  - `mobile/assets/adaptive-icon.png` (Android)
  - `mobile/assets/notification-icon.png`

---

## 📋 Setup Instructions

### 1. Install Dependencies

#### Mobile
```bash
cd mobile
npm install crypto-js expo-linking expo-device
```

#### Backend
```bash
cd backend
npm install axios  # (đã có sẵn)
```

### 2. Database Setup
```bash
cd backend
node database/add_parental_tables.js
```

### 3. Configure Push Notifications
- Update `projectId` trong `mobile/app.config.js`
- Update `projectId` trong `mobile/src/services/notificationService.js`

### 4. Create Assets
- Tạo icon 1024x1024
- Tạo splash screen
- Tạo adaptive icon (Android)
- Tạo notification icon

---

## 🚀 Next Steps

### TypeScript Migration
- Bắt đầu từ utils/helpers
- Define types cho User/Message/Conversation
- Gradual migration

### Unit + Integration Tests
- Jest setup
- Test helpers (getUserDisplayName, errorHandler, queue)
- Test socket events

### Crash Reporting + Analytics
- Integrate Sentry hoặc Firebase Crashlytics
- Track usage và errors

---

## 📝 Notes

- Tất cả features đã được implement và ready để test
- Một số features cần assets và configuration
- Parental controls cần database tables (script đã có)
- Encryption cần install crypto-js
- Push notifications cần Expo project ID

---

**Last Updated**: 2026-01-22
**Version**: 1.0.0

