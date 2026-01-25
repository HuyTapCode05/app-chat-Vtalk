const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const config = require('./config/config');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: config.cors.origins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e8,
  perMessageDeflate: false,
  httpCompression: true,
  connectTimeout: 45000,
  allowUpgrades: true,
  maxConnections: 10000,
});

const usersRoutes = require('./routes/users');
usersRoutes.setIO(io);

const { apiLimiter, sanitizeInput, hideSensitiveHeaders } = require('./middleware/security');

app.use(hideSensitiveHeaders);
app.use(sanitizeInput);
app.use(compression());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', apiLimiter);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static('uploads'));

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
app.use('/api/stories', require('./routes/stories'));
app.use('/api/music', require('./routes/music'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/parental', require('./routes/parental'));
app.use('/api/push-tokens', require('./routes/pushTokens'));

const { socketAuth } = require('./middleware/socketAuth');
io.use(socketAuth);

const { handleSocketConnection } = require('./socket/socketHandler');
io.on('connection', (socket) => {
  console.log(`🔐 Authenticated socket connection: ${socket.userId}`);
  handleSocketConnection(socket, io);
});

const { initDatabase } = require('./database/sqlite');

app.get('/api/health', async (req, res) => {
  const { loginQueue, registerQueue, dbQueue } = require('./utils/requestQueue');
  const sessionManager = require('./utils/sessionManager');
  const memoryManager = require('./utils/memoryManager');
  const connectionPool = require('./utils/connectionPool');
  const batchProcessor = require('./utils/batchProcessor');
  const jobQueue = require('./utils/jobQueue');
  const { userCache, conversationCache, messageCache, generalCache } = require('./utils/advancedCache');
  
  res.json({ 
    status: 'OK', 
    message: 'Server đang chạy',
    storage: 'SQLite + JSON (Messages in JSON files)',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    queues: {
      login: loginQueue.getStats(),
      register: registerQueue.getStats(),
      database: dbQueue.getStats()
    },
    sessions: sessionManager.getStats(),
    memory: memoryManager.getStats(),
    connectionPool: connectionPool.getStats(),
    batchProcessor: batchProcessor.getStats(),
    jobQueue: jobQueue.getStats(),
    backgroundTasks: require('./utils/backgroundTasks').getStats(),
    performance: require('./utils/performanceMonitor').getStats(),
    database: await require('./utils/databaseOptimizer').getStats().catch(() => ({ error: 'Unable to get stats' })),
    cache: {
      users: userCache.getStats(),
      conversations: conversationCache.getStats(),
      messages: messageCache.getStats(),
      general: generalCache.getStats()
    }
  });
});

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
app.use(notFoundHandler);
app.use(errorHandler);

initDatabase()
  .then(() => {
    console.log('✅ Database initialized');
    
    const { startStoryCleanupJob } = require('./utils/storyCronJob');
    startStoryCleanupJob();
    
    const memoryManager = require('./utils/memoryManager');
    memoryManager.start();
    
    const backgroundTasks = require('./utils/backgroundTasks');
    backgroundTasks.startCleanupTasks();
    
    const databaseOptimizer = require('./utils/databaseOptimizer');
    databaseOptimizer.optimize().catch(err => {
      console.warn('Database optimization failed:', err.message);
    });
    
    backgroundTasks.addTask('optimize_database', async () => {
      await databaseOptimizer.optimize();
    }, 24 * 60 * 60 * 1000);
    
    const HOST = process.env.HOST || '0.0.0.0';
    server.listen(config.port, HOST, () => {
      console.log(`🚀 Server đang chạy tại http://${HOST}:${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`✅ Database: SQLite (${config.database.path})`);
      console.log(`✅ Messages: JSON files (data/messages/)`);
      console.log(`📁 Data folder: ${path.join(__dirname, 'data')}`);
      console.log(`📁 Uploads folder: ${path.join(__dirname, config.upload.destination)}`);
      console.log(`💾 Memory manager: Active`);
      console.log(`🗜️ Compression: Enabled`);
      console.log(`🌐 Server accessible from network at http://192.168.1.4:${config.port}`);
    });
  })
  .catch(err => {
    console.error('❌ Database initialization error:', err);
    process.exit(1);
  });
