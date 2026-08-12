// api-gateway/index.js  [COMPLETE — all services wired]
// ============================================================
// TERRITORY RUN — API Gateway
// Single entry point for all backend services
// ============================================================
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

// ── Service imports ───────────────────────────────────────────
const authRoutes = require('../auth-service/routes');
const { setupOAuthRoutes } = require('../auth-service/oauth');
const userRoutes = require('../user-service/routes');
const runRoutes = require('../run-service/routes');
const mapRoutes = require('../map-service/routes');
const leaderboardRoutes = require('../leaderboard-service/routes');
const notificationRoutes = require('../notification-service/routes');
const chatRoutes = require('../chat-service/routes');
const botRoutes = require('../rag-bot-service/routes');
const blockchainRoutes = require('../blockchain-service/routes');
const reportsRoutes = require('../reports-service/routes');
const territoryAnalysisRoutes = require('../territory-service/routes');
const elevationRoutes = require('../elevation-service/routes');
const heatmapRoutes = require('../heatmap-service/routes');
const pythonProxyRoutes = require('./python-proxy');

const { initSocketHandlers } = require('../run-service/socket.handlers');
const { initChatHandlers } = require('../chat-service/socket');
const { registerIO } = require('../notification-service/push');
const { connectDB } = require('../config/db');
const { connectRedis } = require('../config/redis');
const { initialize: initBot } = require('../rag-bot-service/bot.service');
const { seedAchievementDefs } = require('../user-service/achievements');
const { startRagIngestCron } = require('../utils/rag.ingest.cron');
const { registerBlockchainCrons } = require('../blockchain-service/cron');
const cron = require('node-cron');
const { Territory, User } = require('../core/schema');
const { LeaderboardService } = require('../core/services');

const app = express();
const server = http.createServer(app);

// ── Dynamic CORS Allowed Origins ──────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'https://runnify-ktk.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean).map(url => url.replace(/\/$/, '')); // Remove trailing slashes

// ── Socket.IO (main namespace — GPS) + /chat namespace ────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// ── Register notification push IO instance ────────────────────
registerIO(io);

// ── Global Middleware ─────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., mobile apps, curl) or matching origins
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if the origin starts with any of the allowed origins
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    
    console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json({ limit: '15mb' })); // Increased for potential JSON payloads
app.use(express.urlencoded({ extended: true, limit: '15mb' })); // needed for Apple Sign-In form posts

// Global rate limit: 100 req/min per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10000, // Effectively disabled for dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' },
});
app.use(globalLimiter);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  ts: Date.now(),
  uptime: process.uptime(),
}));

// ── Routes ────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/run', runRoutes);
app.use('/map', mapRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/notifications', notificationRoutes);
app.use('/chat', chatRoutes);
app.use('/bot', botRoutes);
app.use('/blockchain', blockchainRoutes);
app.use('/reports', reportsRoutes);
app.use('/territory-analysis', territoryAnalysisRoutes);
app.use('/elevation', elevationRoutes);
app.use('/heatmap', heatmapRoutes);
app.use('/python', pythonProxyRoutes);

// ── OAuth routes (Google + Apple) ────────────────────────────
setupOAuthRoutes(app);

// ── Socket.IO handlers ────────────────────────────────────────
initSocketHandlers(io);   // main namespace: GPS tracking
initChatHandlers(io);     // /chat namespace: community chat

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.stack || err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

// ── Bootstrap ─────────────────────────────────────────────────
const BASE_PORT = Number(process.env.PORT || 4000);
const MAX_PORT_ATTEMPTS = Number(process.env.PORT_RETRY_COUNT || 10);

function startServerWithPortFallback(startPort, maxAttempts) {
  let attempt = 0;

  const tryListen = (port) => {
    const onError = (err) => {
      server.off('error', onError);

      if (err.code === 'EADDRINUSE' && attempt < maxAttempts) {
        attempt += 1;
        const nextPort = startPort + attempt;
        console.warn(`[TerritoryRun API] Port ${port} already in use, retrying on ${nextPort}...`);
        return tryListen(nextPort);
      }

      console.error('[FATAL] Startup failed:', err.message);
      process.exit(1);
    };

    server.once('error', onError);
    server.listen(port, () => {
      server.off('error', onError);
      console.log(`[TerritoryRun API] Running on port ${port}`);
      console.log(`[TerritoryRun API] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('[TerritoryRun API] RAG ingest cron enabled (every 6 hours)');
      console.log('[TerritoryRun API] Blockchain crons enabled (00:00 UTC + 02:00 UTC retry)');
    });
  };

  tryListen(startPort);
}

function registerDailyTerritoryReset() {
  // 23:59 UTC every day
  cron.schedule('59 23 * * *', async () => {
    try {
      const bonusTable = [500, 300, 200, 150, 100, 75, 50, 50, 25, 25];

      // Ensure leaderboard cache is fresh before snapshot
      const entries = await LeaderboardService.buildGlobal();
      const winners = entries.slice(0, 10);

      // Award top-10 bonus credits
      for (let index = 0; index < winners.length; index += 1) {
        const winner = winners[index];
        const bonus = bonusTable[index] || 0;
        if (bonus > 0) {
          await User.findByIdAndUpdate(winner.userId, { $inc: { credits: bonus } });
        }
      }

      // Reset map ownership for new day
      const deleteResult = await Territory.deleteMany({});

      // Recompute global leaderboard after bonuses applied
      await LeaderboardService.buildGlobal();

      // Notify clients for celebration/reset UI
      io.emit('daily_reset', {
        date: new Date().toISOString().split('T')[0],
        winners: winners.slice(0, 3).map((winner, index) => ({
          rank: index + 1,
          userId: winner.userId,
          username: winner.username,
          credits: winner.credits,
          bonus: bonusTable[index] || 0,
        })),
        territoriesCleared: deleteResult.deletedCount || 0,
      });

      console.log(`[DailyReset] Completed. Cleared ${deleteResult.deletedCount || 0} territories, awarded bonuses to ${winners.length} winners.`);
    } catch (err) {
      console.error('[DailyReset] failed:', err.message);
    }
  }, {
    timezone: 'UTC',
  });
}

// Only start the server if this file is run directly (not required as a module for tests)
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await connectRedis();
      await seedAchievementDefs();       // idempotent — safe to run on every start
      await initBot();                   // warm up RAG bot (non-blocking if fails)

      // ── Start RAG data ingestion cron (every 6 hours) ────────────
      startRagIngestCron(6).catch(err => {
        console.warn('[RAGIngestCron] Failed to start:', err.message);
        // Non-fatal — continue server startup
      });

      registerBlockchainCrons();
      registerDailyTerritoryReset();
      startServerWithPortFallback(BASE_PORT, MAX_PORT_ATTEMPTS);
    } catch (err) {
      console.error('[FATAL] Startup failed:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { app, io, server };
