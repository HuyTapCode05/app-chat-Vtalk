const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { db: mainDb } = require('../database/sqlite');

class ConnectionPool {
  constructor(maxConnections = 5) {
    this.maxConnections = maxConnections;
    this.connections = [];
    this.availableConnections = [];
    this.waitingQueue = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    const DB_PATH = path.join(__dirname, '../data/zalo_clone.db');
    
    for (let i = 0; i < this.maxConnections; i++) {
      try {
        const conn = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
          if (err) {
            console.warn(`⚠️ Could not create read connection ${i}:`, err.message);
          }
        });
        
        conn.run('PRAGMA journal_mode = WAL;');
        conn.run('PRAGMA cache_size = -64000;');
        conn.run('PRAGMA synchronous = NORMAL;');
        
        this.connections.push(conn);
        this.availableConnections.push(conn);
      } catch (error) {
        console.warn(`⚠️ Error creating connection ${i}:`, error.message);
      }
    }

    this.initialized = true;
    console.log(`✅ Connection pool initialized with ${this.connections.length} connections`);
  }

  async getConnection() {
    if (!this.initialized) {
      await this.init();
    }

    if (this.availableConnections.length > 0) {
      return this.availableConnections.shift();
    }

    return new Promise((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  releaseConnection(conn) {
    if (this.connections.includes(conn)) {
      this.availableConnections.push(conn);
      
      if (this.waitingQueue.length > 0) {
        const resolve = this.waitingQueue.shift();
        resolve(this.availableConnections.shift());
      }
    }
  }

  async executeRead(sql, params = []) {
    const conn = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      conn.all(sql, params, (err, rows) => {
        this.releaseConnection(conn);
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  getWriteConnection() {
    return mainDb;
  }

  async close() {
    for (const conn of this.connections) {
      conn.close((err) => {
        if (err) console.error('Error closing connection:', err);
      });
    }
    this.connections = [];
    this.availableConnections = [];
    this.initialized = false;
  }

  getStats() {
    return {
      totalConnections: this.connections.length,
      availableConnections: this.availableConnections.length,
      waitingQueue: this.waitingQueue.length,
      maxConnections: this.maxConnections
    };
  }
}

const connectionPool = new ConnectionPool(5);
module.exports = connectionPool;

