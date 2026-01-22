// backend/create_admin.js
const bcrypt = require('bcryptjs');
const { db, run } = require('./database/sqlite');
const { randomUUID } = require('crypto');

const createAdmin = async () => {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('❌ Vui lòng cung cấp đủ thông tin: <username> <email> <password>');
    console.log('   Ví dụ: node create_admin.js admin admin@example.com securepassword123');
  process.exit(1);
}

  const [username, email, password] = args;

  try {
    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (existingUser) {
      console.error(`❌ Lỗi: Người dùng với username '${username}' hoặc email '${email}' đã tồn tại.`);
      process.exit(1);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin user
    const newUser = {
      id: randomUUID(),
      username,
      email,
      password: hashedPassword,
      fullName: 'Administrator', // Default full name
      role: 'admin',
      emailVerified: 1, // Pre-verify admin email
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sql = `
      INSERT INTO users (id, username, email, password, fullName, role, emailVerified, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      newUser.id,
      newUser.username,
      newUser.email,
      newUser.password,
      newUser.fullName,
      newUser.role,
      newUser.emailVerified,
      newUser.createdAt,
      newUser.updatedAt,
    ];

    await run(sql, params);

    console.log('✅ Tài khoản admin đã được tạo thành công!');
    console.log(`   - Username: ${username}`);
    console.log(`   - Email: ${email}`);
    console.log(`   - Password: [Mật khẩu bạn đã nhập]`);

  } catch (error) {
    console.error('❌ Đã xảy ra lỗi khi tạo tài khoản admin:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Lỗi khi đóng kết nối database:', err.message);
      } else {
        console.log('✅ Đã đóng kết nối database.');
      }
    });
  }
};

createAdmin();
