const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, './data/zalo_clone.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    return console.error('Lỗi khi kết nối đến cơ sở dữ liệu:', err.message);
  }
  console.log('Đã kết nối đến cơ sở dữ liệu SQLite để cập nhật schema.');
});

db.serialize(() => {
  db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column')) {
        console.log('Cột `role` đã tồn tại, không cần thêm.');
      } else {
        console.error('Lỗi khi thêm cột `role`:', err.message);
      }
    } else {
      console.log('Đã thêm thành công cột `role` vào bảng `users`.');
    }
  });
});

db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Đã đóng kết nối cơ sở dữ liệu.');
});

