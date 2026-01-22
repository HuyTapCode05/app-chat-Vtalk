/**
 * Push Token Storage
 * Quản lý Expo push tokens cho users
 */

const { run, get, all } = require('../database/sqlite');

const pushTokenStorage = {
  /**
   * Save or update push token
   */
  async saveToken(userId, expoPushToken, platform = null, deviceId = null) {
    const id = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Check if token exists for this user+device
    const existing = deviceId 
      ? await get('SELECT * FROM user_push_tokens WHERE userId = ? AND deviceId = ?', [userId, deviceId])
      : await get('SELECT * FROM user_push_tokens WHERE userId = ? AND expoPushToken = ?', [userId, expoPushToken]);

    if (existing) {
      // Update existing
      await run(
        `UPDATE user_push_tokens 
         SET expoPushToken = ?, platform = ?, updatedAt = ? 
         WHERE id = ?`,
        [expoPushToken, platform, now, existing.id]
      );
      return existing.id;
    } else {
      // Create new
      await run(
        `INSERT INTO user_push_tokens (id, userId, expoPushToken, platform, deviceId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, expoPushToken, platform, deviceId, now, now]
      );
      return id;
    }
  },

  /**
   * Get push tokens for user
   */
  async getTokensByUserId(userId) {
    const tokens = await all(
      'SELECT * FROM user_push_tokens WHERE userId = ?',
      [userId]
    );
    return tokens.map(t => t.expoPushToken);
  },

  /**
   * Get push tokens for multiple users
   */
  async getTokensByUserIds(userIds) {
    if (!userIds || userIds.length === 0) return [];
    
    const placeholders = userIds.map(() => '?').join(',');
    const tokens = await all(
      `SELECT DISTINCT userId, expoPushToken FROM user_push_tokens WHERE userId IN (${placeholders})`,
      userIds
    );
    
    // Group by userId
    const tokensByUser = {};
    tokens.forEach(t => {
      if (!tokensByUser[t.userId]) {
        tokensByUser[t.userId] = [];
      }
      tokensByUser[t.userId].push(t.expoPushToken);
    });
    
    return tokensByUser;
  },

  /**
   * Remove token
   */
  async removeToken(userId, deviceId = null) {
    if (deviceId) {
      await run('DELETE FROM user_push_tokens WHERE userId = ? AND deviceId = ?', [userId, deviceId]);
    } else {
      await run('DELETE FROM user_push_tokens WHERE userId = ?', [userId]);
    }
    return true;
  },
};

module.exports = pushTokenStorage;

