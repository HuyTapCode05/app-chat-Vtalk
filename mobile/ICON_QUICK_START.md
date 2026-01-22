# 🚀 Quick Start - Setup Icons từ icon_vtalk.png

## ✅ Đã hoàn thành!

Các icon files đã được tạo từ `icon_vtalk.png`:
- ✅ `icon.png` - Icon chính
- ✅ `adaptive-icon.png` - Android adaptive icon  
- ✅ `splash.png` - Splash screen
- ✅ `notification-icon.png` - Notification icon

## 📝 Next Steps

### 1. Review Icons
Kiểm tra các file trong `mobile/assets/`:
- Đảm bảo tất cả files đã được tạo
- Icons hiển thị đúng

### 2. Optional: Resize với Sharp (Nếu muốn resize chính xác)

Nếu muốn resize icons về đúng kích thước (không bắt buộc, Expo sẽ tự resize):

```bash
cd mobile
npm install sharp --save-dev
node scripts/generate-icons.js
```

Script sẽ:
- Resize `icon.png` về 1024x1024
- Resize `adaptive-icon.png` về 1024x1024 với safe area
- Resize `splash.png` về 2048x2048
- Resize `notification-icon.png` về 192x192

### 3. Build và Test

```bash
cd mobile

# Prebuild để generate native code
npx expo prebuild

# Test trên Android
npx expo run:android

# Hoặc test trên iOS (macOS only)
npx expo run:ios
```

### 4. Verify Icons

Sau khi build:
- ✅ Icon hiển thị trên home screen
- ✅ Splash screen khi mở app
- ✅ Notification icon trong notifications
- ✅ Adaptive icon trên Android

## 🎨 Customize (Optional)

Nếu muốn customize thêm:

### Notification Icon
Notification icon nên là white icon. Nếu cần:
1. Mở `icon_vtalk.png` trong image editor
2. Convert thành white icon
3. Save as `notification-icon.png`

### Splash Screen
Splash screen sẽ có background #00B14F. Logo sẽ được centered.

## 📱 App Config

File `app.config.js` đã được config sẵn:
- Icon: `./assets/icon.png`
- Splash: `./assets/splash.png` với background #00B14F
- Adaptive Icon: `./assets/adaptive-icon.png`
- Notification Icon: `./assets/notification-icon.png`

## ✅ Done!

App đã sẵn sàng với logo VTalk! 🎉

