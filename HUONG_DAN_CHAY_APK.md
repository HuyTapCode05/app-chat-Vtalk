# Hướng dẫn chạy APK trên điện thoại

## Bước 1: Cài APK vào điện thoại

1. **Chuyển APK vào điện thoại:**
   - Qua USB: Copy file `app-release.apk` vào điện thoại
   - Qua email/cloud: Gửi APK cho chính mình và tải về điện thoại
   - Qua AirDroid/ShareIt: Chia sẻ APK

2. **Bật "Install from unknown sources":**
   - Vào **Settings → Security** (hoặc **Apps → Special access**)
   - Bật **"Install unknown apps"** hoặc **"Install from unknown sources"**
   - Cho phép trình duyệt/file manager cài APK

3. **Cài APK:**
   - Mở file APK trên điện thoại
   - Click **Install**
   - Chờ cài đặt xong

## Bước 2: Chạy Backend Server

Trên máy tính, mở terminal và chạy:

```bash
cd backend
npm run dev
```

Backend sẽ chạy tại: `http://localhost:5000`

## Bước 3: Chạy Expo Dev Server

Mở terminal mới và chạy:

```bash
cd mobile
npx expo start --dev-client
```

Sẽ hiện QR code và URL để kết nối.

## Bước 4: Kiểm tra IP trong api.js

⚠️ **QUAN TRỌNG:** Kiểm tra IP máy tính trong `mobile/src/config/api.js`:

```javascript
const YOUR_COMPUTER_IP = '192.168.1.5'; // ⚠️ THAY ĐỔI IP NÀY!
```

**Cách lấy IP:**
- Windows: `ipconfig` → tìm **IPv4 Address**
- Mac/Linux: `ifconfig` hoặc `ip addr`

**Lưu ý:** IP phải cùng mạng WiFi với điện thoại!

## Bước 5: Mở app và kết nối

1. **Mở app VTalk** trên điện thoại
2. **Quét QR code** từ Expo dev server
   - Hoặc nhập URL hiển thị trong terminal
3. App sẽ kết nối và load code
4. Đăng ký/đăng nhập và test!

## Bước 6: Test WebRTC (Video/Voice Call)

Sau khi kết nối thành công:
- Gọi video/voice call
- WebRTC sẽ hoạt động (có audio/video transmission)
- Test các tính năng: mute, speaker, toggle video

## Troubleshooting

### App không kết nối được:
- ✅ Kiểm tra backend đang chạy chưa
- ✅ Kiểm tra IP trong `api.js` đúng chưa
- ✅ Điện thoại và máy tính cùng WiFi chưa
- ✅ Firewall không chặn port 5000, 8081

### WebRTC không hoạt động:
- ✅ Đảm bảo đã cài APK (không phải Expo Go)
- ✅ Đã chạy `expo start --dev-client` (không phải `expo start`)
- ✅ App đã kết nối với dev server thành công

### Lỗi "Cannot connect to backend":
- Kiểm tra IP trong `mobile/src/config/api.js`
- Chạy `GET_IP.bat` để lấy IP mới
- Đảm bảo backend đang chạy tại port 5000

