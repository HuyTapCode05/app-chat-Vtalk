# ✅ Checklist Kiểm Tra Chức Năng VTalk

## 🔐 Authentication & User Management
- [x] Đăng ký tài khoản (Register)
- [x] Đăng nhập (Login)
- [x] Đăng xuất (Logout)
- [x] Xác thực email (OTP/Link)
- [x] Lấy thông tin user hiện tại (`/auth/me`)
- [x] Cập nhật profile (`PUT /users/me`)
- [x] Upload avatar (`POST /users/me/avatar`)
- [x] Upload cover photo (`POST /users/me/cover`)
- [x] Xem trang cá nhân người khác (`GET /users/:id`)
- [x] Đổi mật khẩu (`PUT /users/me/password`)

## 💬 Conversations & Messages
- [x] Tạo conversation (`POST /conversations`)
- [x] Lấy danh sách conversations (`GET /conversations`)
- [x] Xóa conversation (`DELETE /conversations/:id`)
- [x] Đổi chủ đề nhóm (`PUT /conversations/:id/topic`)
- [x] Ghim conversation (`POST /pinned-conversations`)
- [x] Lưu trữ conversation (`POST /archived-conversations`)
- [x] Xem nhóm chung (`GET /conversations/:id/common-groups`)
- [x] Gửi tin nhắn (Socket: `send-message`)
- [x] Nhận tin nhắn (Socket: `new-message`)
- [x] Thu hồi tin nhắn (Socket: `recall-message`)
- [x] Xóa tin nhắn (local only)
- [x] Ghim tin nhắn (`POST /pinned-messages`)
- [x] Bỏ ghim tin nhắn (`DELETE /pinned-messages/:convId/:msgId`)
- [x] Tìm kiếm tin nhắn (`GET /messages/search`)
- [x] Phản ứng nhanh (`POST /message-reactions`)
- [x] Xóa phản ứng (`DELETE /message-reactions/:msgId/:reaction`)
- [x] Đánh dấu đã đọc (Socket: `mark-read`)
- [x] Typing indicator (Socket: `typing`)

## 👥 Friends & Contacts
- [x] Gửi lời mời kết bạn (`POST /friends/request`)
- [x] Chấp nhận lời mời (`PUT /friends/request/:id/accept`)
- [x] Từ chối lời mời (`PUT /friends/request/:id/reject`)
- [x] Hủy lời mời (`DELETE /friends/request/:id`)
- [x] Lấy danh sách lời mời (`GET /friends/requests`)
- [x] Lấy danh sách bạn bè (`GET /friends`)
- [x] Hủy kết bạn (`DELETE /friends/:userId`)
- [x] Đánh dấu bạn thân (`POST /close-friends`)
- [x] Bỏ đánh dấu bạn thân (`DELETE /close-friends/:friendId`)
- [x] Xem tất cả người dùng (`GET /users` - Tab "All")

## 🚫 Blocks & Privacy
- [x] Chặn người dùng (`POST /blocks`)
- [x] Bỏ chặn (`DELETE /blocks/:blockedId`)
- [x] Xem danh sách đã chặn (`GET /blocks`)
- [x] Kiểm tra trạng thái chặn (`GET /blocks/check/:userId`)

## 🏷️ Nicknames
- [x] Đặt biệt danh (`POST /nicknames`)
- [x] Xóa biệt danh (`DELETE /nicknames/:targetUserId`)
- [x] Lấy tất cả biệt danh (`GET /nicknames`)
- [x] Lấy biệt danh của một user (`GET /nicknames/:targetUserId`)

## 📱 Posts & Social
- [x] Tạo bài viết (`POST /posts`)
- [x] Lấy bài viết của user (`GET /posts/user/:userId`)
- [x] Xóa bài viết (`DELETE /posts/:id`)
- [x] Like/Unlike bài viết (`PUT /posts/:id/like`)
- [x] Comment bài viết (`POST /posts/:id/comments`)
- [x] Xem comments (`GET /posts/:id/comments`)

## 📞 Calls
- [x] Gọi voice (`call-request` socket)
- [x] Gọi video (`call-request` socket)
- [x] Nhận cuộc gọi (`incoming-call` socket)
- [x] Chấp nhận cuộc gọi (`call-accept` socket)
- [x] Từ chối cuộc gọi (`call-reject` socket)
- [x] Kết thúc cuộc gọi (`call-end` socket)
- [x] WebRTC signaling (`webrtc-offer`, `webrtc-answer`, `webrtc-ice-candidate`)

## 🔍 Search & Filter
- [x] Tìm kiếm conversations (local filter)
- [x] Tìm kiếm messages (`GET /messages/search`)
- [x] Tìm kiếm users (`GET /users/search`)
- [x] Filter theo tab (Requests, Friends, Groups, All)

## ⚙️ UI Features
- [x] Online status indicator
- [x] Read receipts (sent, delivered, read)
- [x] Typing indicator với animation
- [x] Avatar display (image hoặc text fallback)
- [x] Cover photo display
- [x] Emoji picker
- [x] Image picker & upload
- [x] Long press menu cho messages
- [x] Header menu (3 gạch) cho chat
- [x] Contact menu (unfriend, block, nickname, close friend)

## 🐛 Các Vấn Đề Đã Sửa
- [x] JSON parsing error trong `pinnedMessages.js`
- [x] Missing `useMemo` import trong `ContactsScreen.js`
- [x] Missing helper functions import trong `ContactsScreen.js`
- [x] `storage.messages.getMessages` → `loadMessages`
- [x] Syntax errors trong các component (`memo` closing)
- [x] Missing dependency array trong `useCallback`
- [x] Participants parsing safety trong `dbStorage.js`

## ⚠️ Cần Kiểm Tra Thêm
- [ ] Email verification hoạt động đúng không (OTP/Link)
- [ ] WebRTC calls hoạt động trên mobile không
- [ ] Image upload hoạt động trên cả web và mobile
- [ ] Real-time updates (avatar, cover photo) hoạt động không
- [ ] Block user có ngăn messages không
- [ ] Search messages hoạt động đúng không
- [ ] Pinned messages hiển thị đúng không
- [ ] Archived conversations hoạt động không

## 📝 Ghi Chú
- Tất cả API endpoints đều có authentication middleware
- Socket events đều có validation
- Error handling đã được cải thiện
- Logging đã được thêm vào các chức năng quan trọng

