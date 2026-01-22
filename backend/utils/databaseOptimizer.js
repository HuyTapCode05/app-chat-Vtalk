const { db } = require('../database/sqlite');
const performanceMonitor = require('./performanceMonitor');

class DatabaseOptimizer {
  async optimize() {
    try {
      await this.analyzeTables();
      await this.vacuum();
      await this.updateStatistics();
      console.log('✅ Database optimized');
    } catch (error) {
      console.error('Error optimizing database:', error);
    }
  }

  async analyzeTables() {
    return new Promise((resolve, reject) => {
      db.run('ANALYZE', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async vacuum() {
    return new Promise((resolve, reject) => {
      db.run('VACUUM', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async updateStatistics() {
    return new Promise((resolve, reject) => {
      db.run('PRAGMA optimize', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getStats() {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          page_count as pages,
          page_size,
          page_count * page_size as size_bytes
        FROM pragma_page_count(), pragma_page_size()
      `, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            pages: row.pages,
            pageSize: row.page_size,
            sizeBytes: row.size_bytes,
            sizeMB: (row.size_bytes / 1024 / 1024).toFixed(2)
          });
        }
      });
    });
  }

  async executeQuery(label, queryFn) {
    return performanceMonitor.measure(`db:${label}`, queryFn);
  }
}

const databaseOptimizer = new DatabaseOptimizer();
module.exports = databaseOptimizer;

