# Hướng dẫn Build APK

## Vấn đề: Thiếu Android SDK Build-Tools 36

Build đang fail vì thiếu Android SDK Build-Tools 36.

## Giải pháp:

### Cách 1: Cài Build-Tools 36 (Khuyến nghị)

1. Mở **Android Studio**
2. Vào **Tools → SDK Manager**
3. Tab **SDK Tools**
4. Tích chọn **Android SDK Build-Tools 36**
5. Click **Apply** để cài đặt
6. Chạy lại build:
   ```bash
   QUICK_REBUILD.bat
   # Chọn [2] Build APK
   ```

### Cách 2: Dùng Build-Tools có sẵn

Nếu không muốn cài Build-Tools 36, có thể dùng version thấp hơn (như 34.0.0 hoặc 35.0.0):

1. Kiểm tra version có sẵn:
   ```powershell
   Get-ChildItem "C:\Users\huy63\AppData\Local\Android\Sdk\build-tools" -Directory
   ```

2. Cập nhật `mobile/app.config.js` để dùng version thấp hơn (nếu cần)

### Cách 3: Cài qua Command Line

```bash
# Cài Build-Tools 36
cd C:\Users\huy63\AppData\Local\Android\Sdk\tools\bin
sdkmanager "build-tools;36.0.0"
```

## Sau khi cài Build-Tools:

1. Chạy lại build:
   ```bash
   QUICK_REBUILD.bat
   # Chọn [2] Build APK
   ```

2. APK sẽ ở: `mobile\android\app\build\outputs\apk\release\app-release.apk`

3. Cài APK vào điện thoại và chạy:
   ```bash
   cd mobile
   npx expo start --dev-client
   ```

