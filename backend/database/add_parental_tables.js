/**
 * Add Parental Controls Tables to Database
 * Run this script to add necessary tables for parental controls
 */

const { run, get, all } = require('./sqlite');

const addParentalTables = async () => {
  return new Promise((resolve, reject) => {
    const db = require('./sqlite').db;
    
    db.serialize(() => {
      // Contact approvals table
      db.run(`
        CREATE TABLE IF NOT EXISTS contact_approvals (
          id TEXT PRIMARY KEY,
          childUserId TEXT NOT NULL,
          parentUserId TEXT NOT NULL,
          requestedUserId TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (childUserId) REFERENCES users(id),
          FOREIGN KEY (parentUserId) REFERENCES users(id),
          FOREIGN KEY (requestedUserId) REFERENCES users(id),
          UNIQUE(childUserId, requestedUserId)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating contact_approvals table:', err);
          reject(err);
          return;
        }
        console.log('✅ contact_approvals table created');
      });

      // Activity log table
      db.run(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          activityType TEXT NOT NULL,
          activityData TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating activity_logs table:', err);
          reject(err);
          return;
        }
        console.log('✅ activity_logs table created');
      });

      // User push tokens table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_push_tokens (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          expoPushToken TEXT NOT NULL,
          platform TEXT,
          deviceId TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          UNIQUE(userId, deviceId)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating user_push_tokens table:', err);
          reject(err);
          return;
        }
        console.log('✅ user_push_tokens table created');
      });

      // Create indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_contact_approvals_child ON contact_approvals(childUserId)`, (err) => {
        if (err) console.warn('Warning creating index:', err);
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_contact_approvals_parent ON contact_approvals(parentUserId)`, (err) => {
        if (err) console.warn('Warning creating index:', err);
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(userId)`, (err) => {
        if (err) console.warn('Warning creating index:', err);
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user ON user_push_tokens(userId)`, (err) => {
        if (err) {
          console.warn('Warning creating index:', err);
        } else {
          console.log('✅ Parental controls tables initialized');
          resolve();
        }
      });
    });
  });
};

// Run if called directly
if (require.main === module) {
  addParentalTables()
    .then(() => {
      console.log('✅ All parental control tables created');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error creating tables:', err);
      process.exit(1);
    });
}

module.exports = { addParentalTables };

