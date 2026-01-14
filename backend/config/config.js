/**
 * Backend Configuration
 * Centralized configuration management
 */

require('dotenv').config();

const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    path: process.env.DATABASE_PATH || './data/zalo_clone.db',
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // CORS
  cors: {
    origins: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:8081',
      'http://localhost:19006',
      'http://192.168.1.5:8081',
      'http://192.168.1.5:19006',
    ],
  },
  
  // File Upload
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    destination: './uploads',
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    authMax: 20, // limit auth endpoints to 20 requests
  },
  
  // Security
  security: {
    bcryptRounds: 10,
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.NODE_ENV !== 'production',
  },
};

module.exports = config;

