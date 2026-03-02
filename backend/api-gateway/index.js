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

const { initSocketHandlers } = require('../run-service/socket.handlers');
const { initChatHandlers } = require('../chat-service/socket');
const { registerIO } = require('../notification-service/push');
const { connectDB } = require('../config/db');
const { connectRedis } = require('../config/redis');
const { initialize: initBot } = require('../rag-bot-service/bot.service');
const { seedAchievementDefs } = require('../user-service/achievements');
const { startRagIngestCron } = require('../utils/rag.ingest.cron');
const { registerBlockchainCrons } = require('../blockchain-service/cron');

const app = express();
const server = http.createServer(app);

// ── Socket.IO (main namespace — GPS) + /chat namespace ────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ── Register notification push IO instance ────────────────────
registerIO(io);

// ── Global Middleware ─────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
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
    startServerWithPortFallback(BASE_PORT, MAX_PORT_ATTEMPTS);
  } catch (err) {
    console.error('[FATAL] Startup failed:', err.message);
    process.exit(1);
  }
})();

module.exports = { app, io };
