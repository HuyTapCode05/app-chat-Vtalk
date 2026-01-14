# 🚀 Hướng dẫn Upload lên GitHub

## Bước 1: Tạo Repository trên GitHub

1. Đăng nhập vào [GitHub.com](https://github.com)
2. Click nút **"New"** hoặc **"+"** ở góc trên bên phải
3. Chọn **"New repository"**
4. Điền thông tin:
   - **Repository name**: `react-native-chat-app` (hoặc tên khác bạn muốn)
   - **Description**: `A modern React Native chat application with real-time messaging and voice/video calls`
   - **Visibility**: Chọn **Public** (để mọi người có thể xem) hoặc **Private** (chỉ bạn xem được)
   - ❌ **KHÔNG** tích vào "Add a README file" (vì chúng ta đã có rồi)
   - ❌ **KHÔNG** tích vào "Add .gitignore" (vì chúng ta đã có rồi)
5. Click **"Create repository"**

## Bước 2: Connect với Repository

Sau khi tạo repository, GitHub sẽ hiển thị trang với các lệnh. Thực hiện các lệnh sau:

### 2.1. Thêm remote origin (thay YOUR_USERNAME và YOUR_REPO_NAME)
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### 2.2. Đổi tên branch chính
```bash
git branch -M main
```

### 2.3. Push code lên GitHub
```bash
git push -u origin main
```

## Bước 3: Các lệnh cụ thể cho project này

Chạy lần lượt các lệnh sau trong terminal (đã ở thư mục fe-be):

```bash
# Thêm remote origin (THAY ĐỔI URL với repository của bạn)
git remote add origin https://github.com/YOUR_USERNAME/react-native-chat-app.git

# Đổi tên branch
git branch -M main  

# Push lên GitHub
git push -u origin main
```

## 🔐 Xác thực GitHub

Nếu gặp lỗi xác thực, bạn có thể:

### Option 1: Personal Access Token (Khuyến nghị)
1. Vào GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Tạo token mới với quyền `repo`
3. Sử dụng token thay cho password khi push

### Option 2: SSH Key
1. Tạo SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Thêm vào GitHub Settings → SSH and GPG keys
3. Clone bằng SSH URL thay vì HTTPS

## 📱 Features của ứng dụng

✅ **Real-time Chat** - Tin nhắn thời gian thực  
✅ **Voice/Video Calls** - Cuộc gọi thoại và video  
✅ **Group Chat** - Chat nhóm  
✅ **Contact Management** - Quản lý danh bạ  
✅ **User Authentication** - Xác thực người dùng  
✅ **Profile Management** - Quản lý profile  
✅ **Emoji Reactions** - Thả cảm xúc  
✅ **Push Notifications** - Thông báo đẩy  

## 🛠️ Tech Stack

- **React Native** - Framework chính
- **Socket.IO** - Real-time communication  
- **WebRTC** - Voice/Video calls
- **AsyncStorage** - Local storage
- **React Navigation** - Navigation

## 🎯 Next Steps

Sau khi upload thành công:
1. ⭐ Star repository của bạn
2. 📝 Update README với screenshots
3. 🏷️ Tạo releases/tags
4. 📄 Thêm LICENSE file
5. 👥 Mời contributors

---
**Chúc bạn upload thành công! 🎉**