/**
 * Session Manager
 * Quản lý multiple sessions/connections cho cùng một user (web + mobile)
 */

class SessionManager {
  constructor() {
    // Map: userId -> Set of socketIds
    this.userSessions = new Map();
    // Map: socketId -> userId
    this.socketToUser = new Map();
    // Map: userId -> device info
    this.userDevices = new Map();
  }

  /**
   * Add session for user
   */
  addSession(userId, socketId, deviceInfo = {}) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
      this.userDevices.set(userId, []);
    }

    this.userSessions.get(userId).add(socketId);
    this.socketToUser.set(socketId, userId);

    // Track device info
    const devices = this.userDevices.get(userId);
    const deviceIndex = devices.findIndex(d => d.socketId === socketId);
    
    if (deviceIndex >= 0) {
      devices[deviceIndex] = { ...devices[deviceIndex], ...deviceInfo, lastSeen: new Date() };
    } else {
      devices.push({
        socketId,
        ...deviceInfo,
        connectedAt: new Date(),
        lastSeen: new Date()
      });
    }
  }

  /**
   * Remove session
   */
  removeSession(socketId) {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return null;

    const sessions = this.userSessions.get(userId);
    if (sessions) {
      sessions.delete(socketId);
      if (sessions.size === 0) {
        this.userSessions.delete(userId);
        this.userDevices.delete(userId);
      } else {
        // Remove device info
        const devices = this.userDevices.get(userId);
        if (devices) {
          const deviceIndex = devices.findIndex(d => d.socketId === socketId);
          if (deviceIndex >= 0) {
            devices.splice(deviceIndex, 1);
          }
        }
      }
    }

    this.socketToUser.delete(socketId);
    return userId;
  }

  /**
   * Get all socket IDs for a user
   */
  getUserSockets(userId) {
    const sessions = this.userSessions.get(userId);
    return sessions ? Array.from(sessions) : [];
  }

  /**
   * Get user ID from socket ID
   */
  getUserFromSocket(socketId) {
    return this.socketToUser.get(socketId);
  }

  /**
   * Check if user has active sessions
   */
  hasActiveSessions(userId) {
    const sessions = this.userSessions.get(userId);
    return sessions && sessions.size > 0;
  }

  /**
   * Get device count for user
   */
  getDeviceCount(userId) {
    const sessions = this.userSessions.get(userId);
    return sessions ? sessions.size : 0;
  }

  /**
   * Get all devices info for user
   */
  getUserDevices(userId) {
    return this.userDevices.get(userId) || [];
  }

  /**
   * Update device last seen
   */
  updateDeviceLastSeen(socketId) {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return;

    const devices = this.userDevices.get(userId);
    if (devices) {
      const device = devices.find(d => d.socketId === socketId);
      if (device) {
        device.lastSeen = new Date();
      }
    }
  }

  /**
   * Get all connected users count
   */
  getTotalConnectedUsers() {
    return this.userSessions.size;
  }

  /**
   * Get total active sessions
   */
  getTotalActiveSessions() {
    let total = 0;
    for (const sessions of this.userSessions.values()) {
      total += sessions.size;
    }
    return total;
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      totalUsers: this.userSessions.size,
      totalSessions: this.getTotalActiveSessions(),
      averageDevicesPerUser: this.userSessions.size > 0 
        ? (this.getTotalActiveSessions() / this.userSessions.size).toFixed(2)
        : 0
    };
  }
}

// Singleton instance
const sessionManager = new SessionManager();

module.exports = sessionManager;

