const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const DB_PATH = path.join(__dirname, '../data/zalo_clone.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Create database connection with WAL mode for better concurrent access
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
  } else {
    console.log('✅ Connected to SQLite database');
    
    // Enable WAL mode for better concurrent read/write performance
    db.run('PRAGMA journal_mode = WAL;', (err) => {
      if (err) {
        console.warn('⚠️ Could not enable WAL mode:', err.message);
      } else {
        console.log('✅ WAL mode enabled for concurrent access');
      }
    });
    
    // Set busy timeout to handle concurrent writes (5 seconds)
    db.configure('busyTimeout', 5000);
    
    // Optimize for concurrent access
    db.run('PRAGMA synchronous = NORMAL;', (err) => {
      if (err) console.warn('⚠️ Could not set synchronous mode:', err.message);
    });
    
    // Increase cache size for better performance (64MB)
    db.run('PRAGMA cache_size = -64000;', (err) => {
      if (err) console.warn('⚠️ Could not set cache size:', err.message);
    });
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) console.warn('⚠️ Could not enable foreign keys:', err.message);
    });
  }
});

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let errorOccurred = false;
      
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          fullName TEXT NOT NULL,
          avatar TEXT,
          coverPhoto TEXT,
          emailVerified INTEGER DEFAULT 0,
          verificationToken TEXT,
          isOnline INTEGER DEFAULT 0,
          lastSeen DATETIME,
          role TEXT DEFAULT 'user',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Email Verifications table
      db.run(`
        CREATE TABLE IF NOT EXISTS email_verifications (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          email TEXT NOT NULL,
          code TEXT,
          token TEXT,
          type TEXT NOT NULL,
          expiresAt DATETIME NOT NULL,
          verified INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Stories table
      db.run(`
        CREATE TABLE IF NOT EXISTS stories (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          type TEXT NOT NULL,
          content TEXT,
          mediaUrl TEXT,
          backgroundColor TEXT,
          textColor TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          expiresAt DATETIME NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Story views table
      db.run(`
        CREATE TABLE IF NOT EXISTS story_views (
          id TEXT PRIMARY KEY,
          storyId TEXT NOT NULL,
          viewerId TEXT NOT NULL,
          viewedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (storyId) REFERENCES stories(id) ON DELETE CASCADE,
          FOREIGN KEY (viewerId) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(storyId, viewerId)
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Conversations table
      db.run(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL DEFAULT 'private',
          name TEXT,
          participants TEXT NOT NULL,
          admins TEXT,
          lastMessage TEXT,
          lastMessageAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Ensure admins column exists on older databases
      db.run(`
        ALTER TABLE conversations ADD COLUMN admins TEXT
      `, (err) => {
        if (err && !errorOccurred) {
          // Ignore "duplicate column" errors if column already exists
          const msg = err.message || '';
          if (!msg.includes('duplicate column') && !msg.includes('duplicate column name')) {
            errorOccurred = true;
            reject(err);
          }
        }
      });

      // Posts table
      db.run(`
        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY,
          authorId TEXT NOT NULL,
          content TEXT,
          image TEXT,
          likes TEXT DEFAULT '[]',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (authorId) REFERENCES users(id)
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Post comments table
      db.run(`
        CREATE TABLE IF NOT EXISTS post_comments (
          id TEXT PRIMARY KEY,
          postId TEXT NOT NULL,
          authorId TEXT NOT NULL,
          content TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (postId) REFERENCES posts(id),
          FOREIGN KEY (authorId) REFERENCES users(id)
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Friend requests table
      db.run(`
        CREATE TABLE IF NOT EXISTS friend_requests (
          id TEXT PRIMARY KEY,
          fromUserId TEXT NOT NULL,
          toUserId TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (fromUserId) REFERENCES users(id),
          FOREIGN KEY (toUserId) REFERENCES users(id),
          UNIQUE(fromUserId, toUserId)
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Friends table (for accepted friend requests)
      db.run(`
        CREATE TABLE IF NOT EXISTS friends (
          id TEXT PRIMARY KEY,
          userId1 TEXT NOT NULL,
          userId2 TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId1) REFERENCES users(id),
          FOREIGN KEY (userId2) REFERENCES users(id),
          UNIQUE(userId1, userId2)
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Blocks table (for blocking users)
      db.run(`
        CREATE TABLE IF NOT EXISTS blocks (
          id TEXT PRIMARY KEY,
          blockerId TEXT NOT NULL,
          blockedId TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (blockerId) REFERENCES users(id),
          FOREIGN KEY (blockedId) REFERENCES users(id),
          UNIQUE(blockerId, blockedId)
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // User nicknames table (for custom nicknames)
      db.run(`
        CREATE TABLE IF NOT EXISTS user_nicknames (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          targetUserId TEXT NOT NULL,
          nickname TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (targetUserId) REFERENCES users(id),
          UNIQUE(userId, targetUserId)
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Pinned messages table
      db.run(`
        CREATE TABLE IF NOT EXISTS pinned_messages (
          id TEXT PRIMARY KEY,
          conversationId TEXT NOT NULL,
          messageId TEXT NOT NULL,
          pinnedBy TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversationId) REFERENCES conversations(id),
          FOREIGN KEY (pinnedBy) REFERENCES users(id),
          UNIQUE(conversationId, messageId)
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Close friends table (đánh dấu bạn thân)
      db.run(`
        CREATE TABLE IF NOT EXISTS close_friends (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          friendId TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (friendId) REFERENCES users(id),
          UNIQUE(userId, friendId)
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Pinned conversations table
      db.run(`
        CREATE TABLE IF NOT EXISTS pinned_conversations (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          conversationId TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (conversationId) REFERENCES conversations(id),
          UNIQUE(userId, conversationId)
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Archived conversations table
      db.run(`
        CREATE TABLE IF NOT EXISTS archived_conversations (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          conversationId TEXT NOT NULL,
          archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (conversationId) REFERENCES conversations(id),
          UNIQUE(userId, conversationId)
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Message reactions table (cảm xúc nhanh)
      db.run(`
        CREATE TABLE IF NOT EXISTS message_reactions (
          id TEXT PRIMARY KEY,
          messageId TEXT NOT NULL,
          userId TEXT NOT NULL,
          reaction TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id),
          UNIQUE(messageId, userId, reaction)
        )
      `, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Create indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participants)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(authorId)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(postId)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      // Additional indexes for optimization
      db.run(`CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_conversations_lastMessageAt ON conversations(lastMessageAt DESC)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_friends_userId1 ON friends(userId1)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_friends_userId2 ON friends(userId2)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_friend_requests_fromUserId ON friend_requests(fromUserId)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_friend_requests_toUserId ON friend_requests(toUserId)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_blocks_blockerId ON blocks(blockerId)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_blocks_blockedId ON blocks(blockedId)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_email_verifications_userId ON email_verifications(userId)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_email_verifications_code ON email_verifications(code)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_stories_userId_expiresAt ON stories(userId, expiresAt)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        }
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_story_views_storyId ON story_views(storyId)`, (err) => {
        if (err && !errorOccurred) {
          errorOccurred = true;
          reject(err);
        } else if (!errorOccurred) {
          console.log('✅ Database tables initialized');

          // Add role column to users if not exists
          db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {
            if (err && !err.message.includes('duplicate column')) {
              console.warn('Warning adding role column:', err.message);
            }
          });
          
          // Add wallpaper column to conversations if not exists
          db.run(`
            ALTER TABLE conversations ADD COLUMN wallpaper TEXT
          `, (err) => {
            // Ignore error if column already exists
            if (err && !err.message.includes('duplicate column')) {
              console.warn('Warning adding wallpaper column:', err.message);
            }
          });
          
          resolve();
        }
      });
    });
  });
};

// Helper: Run query and return promise
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

// Helper: Get one row
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Helper: Get all rows
const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Initialize on load
initDatabase().catch(console.error);

module.exports = {
  db,
  run,
  get,
  all,
  initDatabase,
};
