# 📱 VTalk App Icon Setup Guide

## 🎯 Mục tiêu
Setup icon cho VTalk app để khi build và tải về, icon hiển thị đúng logo VTalk.

## 📋 Yêu cầu

Bạn cần có logo VTalk ở định dạng PNG với kích thước lớn (ít nhất 1024x1024).

## 🚀 Cách 1: Tự động Generate (Khuyến nghị)

### Bước 1: Chuẩn bị logo source
1. Đặt logo VTalk vào `mobile/assets/logo-source.png`
2. Logo nên có kích thước ít nhất 1024x1024 pixels
3. Format: PNG với transparent background (nếu có)

### Bước 2: Install dependencies
```bash
cd mobile
npm install sharp --save-dev
```

### Bước 3: Generate icons
```bash
node scripts/generate-icons.js
```

Script sẽ tự động tạo:
- `icon.png` (1024x1024) - Icon chính
- `adaptive-icon.png` (1024x1024) - Android adaptive icon
- `splash.png` (2048x2048) - Splash screen
- `notification-icon.png` (96x96) - Notification icon

### Bước 4: Review và adjust
Kiểm tra các file đã generate trong `mobile/assets/`:
- Đảm bảo icon hiển thị đúng
- Notification icon nên là white icon (có thể cần chỉnh thủ công)

## 🎨 Cách 2: Manual Setup

### Bước 1: Tạo các file icon

Tạo các file sau trong `mobile/assets/`:

#### 1. icon.png
- **Size**: 1024x1024 pixels
- **Format**: PNG
- **Content**: Logo VTalk full (có thể có background xanh #00B14F)

#### 2. adaptive-icon.png
- **Size**: 1024x1024 pixels
- **Format**: PNG
- **Safe Area**: 832x832 pixels (tránh bị crop ở góc)
- **Content**: Logo VTalk với padding xung quanh

#### 3. splash.png
- **Size**: 2048x2048 pixels (hoặc 2732x2732 cho iOS)
- **Format**: PNG
- **Background**: #00B14F (xanh lá)
- **Content**: Logo VTalk centered

#### 4. notification-icon.png
- **Size**: 96x96 pixels (hoặc 192x192 cho high DPI)
- **Format**: PNG với transparent background
- **Content**: White icon (chỉ icon, không background)
- **Note**: Nên là monochrome white icon

### Bước 2: Verify app.config.js

File `app.config.js` đã được config sẵn:
```javascript
icon: "./assets/icon.png",
splash: {
  image: "./assets/splash.png",
  backgroundColor: "#00B14F"
},
android: {
  adaptiveIcon: {
    foregroundImage: "./assets/adaptive-icon.png",
    backgroundColor: "#00B14F"
  }
}
```

## 🧪 Testing

### Test trên Development
```bash
cd mobile
npx expo start
```

### Test với Native Build
```bash
# Android
npx expo prebuild
npx expo run:android

# iOS
npx expo prebuild
npx expo run:ios
```

### Test Icon trên Device
1. Build app
2. Install trên device
3. Kiểm tra icon trên home screen
4. Kiểm tra splash screen khi mở app
5. Kiểm tra notification icon (gửi test notification)

## 📐 Icon Specifications

### iOS
- **App Icon**: 1024x1024 (không có rounded corners, iOS tự thêm)
- **Splash**: 2048x2048 hoặc 2732x2732

### Android
- **Adaptive Icon**: 1024x1024
  - **Foreground**: 832x832 (safe area)
  - **Background**: #00B14F
- **Notification Icon**: 96x96 (mdpi), 144x144 (hdpi), 192x192 (xhdpi)

## 🎨 Design Tips

### Icon Design
- Logo nên centered
- Tránh text quá nhỏ
- Đảm bảo readable ở kích thước nhỏ
- Sử dụng màu #00B14F cho background

### Adaptive Icon
- Logo nên nằm trong safe area (832x832)
- Background có thể extend ra ngoài
- Test trên nhiều device shapes

### Splash Screen
- Logo centered
- Background #00B14F
- Simple và clean

### Notification Icon
- Chỉ icon, không text
- White color trên transparent
- Simple design

## 🔧 Troubleshooting

### Icon không hiển thị
1. Kiểm tra file path trong `app.config.js`
2. Đảm bảo file tồn tại trong `assets/`
3. Run `npx expo prebuild` lại

### Icon bị crop (Android)
1. Kiểm tra safe area (832x832)
2. Điều chỉnh `adaptive-icon.png`
3. Test trên nhiều device shapes

### Splash screen không đúng
1. Kiểm tra `backgroundColor` trong `app.config.js`
2. Đảm bảo `splash.png` có đúng size
3. Clear cache: `npx expo start --clear`

## 📝 Checklist

- [ ] Logo source file ready (1024x1024+)
- [ ] icon.png created (1024x1024)
- [ ] adaptive-icon.png created (1024x1024, safe area 832x832)
- [ ] splash.png created (2048x2048)
- [ ] notification-icon.png created (96x96 white)
- [ ] app.config.js updated
- [ ] Tested trên development
- [ ] Tested với native build
- [ ] Icon hiển thị đúng trên device

## 🎉 Done!

Sau khi hoàn thành, app sẽ hiển thị logo VTalk đẹp mắt khi:
- Install trên device
- Hiển thị trên home screen
- Mở app (splash screen)
- Nhận notifications

