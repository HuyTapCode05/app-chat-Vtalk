/**
 * VTalk Backend Server
 * Main server file with Express and Socket.io setup
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config/config');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: config.cors.origins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Allow both transports
  allowEIO3: true, // Support older clients
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 30000, // 30 seconds
  maxHttpBufferSize: 1e8, // 100MB
});

// Pass io to routes that need it
const usersRoutes = require('./routes/users');
usersRoutes.setIO(io);

// Security middleware
const { apiLimiter, sanitizeInput, hideSensitiveHeaders } = require('./middleware/security');

// Middleware
app.use(hideSensitiveHeaders);
app.use(sanitizeInput);
app.use(cors({
  origin: true, // Allow all origins for development debugging
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', apiLimiter);

// Tạo thư mục uploads nếu chưa có
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files (uploads)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', usersRoutes);
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/blocks', require('./routes/blocks'));
app.use('/api/nicknames', require('./routes/nicknames'));
app.use('/api/pinned-messages', require('./routes/pinnedMessages'));
app.use('/api/close-friends', require('./routes/closeFriends'));
app.use('/api/posts', require('./routes/posts'));

// Socket.io connection handling
const { handleSocketConnection } = require('./socket/socketHandler');
io.on('connection', (socket) => handleSocketConnection(socket, io));

// Initialize database BEFORE starting server
const { initDatabase } = require('./database/sqlite');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server đang chạy',
    storage: 'SQLite + JSON (Messages in JSON files)'
  });
});

// Initialize database then start server
initDatabase()
  .then(() => {
    console.log('✅ Database initialized');
    server.listen(config.port, () => {
      console.log(`🚀 Server đang chạy tại port ${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`✅ Database: SQLite (${config.database.path})`);
      console.log(`✅ Messages: JSON files (data/messages/)`);
      console.log(`📁 Data folder: ${path.join(__dirname, 'data')}`);
      console.log(`📁 Uploads folder: ${path.join(__dirname, config.upload.destination)}`);
    });
  })
  .catch(err => {
    console.error('❌ Database initialization error:', err);
    process.exit(1);
  });
