# 📱 VTalk App Icons Setup

## Required Icon Files

Để app hiển thị icon đúng khi build và tải về, bạn cần tạo các file sau trong thư mục `mobile/assets/`:

### 1. Icon (Main App Icon)
- **File**: `icon.png`
- **Size**: 1024x1024 pixels
- **Format**: PNG với transparent background (nếu cần)
- **Usage**: Icon chính của app, hiển thị trên home screen

### 2. Adaptive Icon (Android)
- **File**: `adaptive-icon.png`
- **Size**: 1024x1024 pixels
- **Format**: PNG
- **Safe Area**: 832x832 pixels (tránh bị crop ở các góc)
- **Usage**: Android adaptive icon, tự động adapt theo device

### 3. Splash Screen
- **File**: `splash.png`
- **Size**: 2048x2048 pixels (hoặc 2732x2732 cho iOS)
- **Format**: PNG
- **Usage**: Màn hình splash khi mở app

### 4. Notification Icon (Android)
- **File**: `notification-icon.png`
- **Size**: 96x96 pixels (hoặc 192x192 cho high DPI)
- **Format**: PNG với transparent background
- **Color**: White icon trên transparent background
- **Usage**: Icon hiển thị trong notifications

## Cách tạo từ logo VTalk

### Option 1: Sử dụng logo hiện có
1. Mở logo VTalk trong image editor (Photoshop, GIMP, Figma, etc.)
2. Resize về 1024x1024 cho `icon.png`
3. Tạo version với safe area (832x832) cho `adaptive-icon.png`
4. Tạo version lớn hơn cho `splash.png`

### Option 2: Sử dụng online tools
- [App Icon Generator](https://www.appicon.co/)
- [Icon Kitchen](https://icon.kitchen/)
- [MakeAppIcon](https://makeappicon.com/)

### Option 3: Sử dụng Expo tools
```bash
cd mobile
npx expo-optimize
```

## File Structure

```
mobile/
├── assets/
│   ├── icon.png              (1024x1024)
│   ├── adaptive-icon.png     (1024x1024, safe area 832x832)
│   ├── splash.png            (2048x2048)
│   └── notification-icon.png (96x96 hoặc 192x192)
└── app.config.js
```

## Testing

Sau khi thêm icons, test bằng:
```bash
cd mobile
npx expo prebuild
npx expo run:android
# hoặc
npx expo run:ios
```

## Notes

- Icon phải có kích thước chính xác
- Adaptive icon nên có safe area để tránh bị crop
- Splash screen nên match với theme color (#00B14F)
- Notification icon nên là white icon trên transparent background

