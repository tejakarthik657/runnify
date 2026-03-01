/**
 * API Gateway - Main Entry Point
 * Integrates all microservices
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();

// Import configurations
const { connectDB } = require('../config/db');
const { testConnection: testRedis } = require('../config/redis');
const logger = require('../utils/logger');

// Import middleware
const { standardRateLimit } = require('../middleware/rateLimit');
const errorHandler = require('../middleware/errorHandler');

// Import services
const authRoutes = require('../auth-service/routes');
const userRoutes = require('../user-service/routes');
const runRoutes = require('../run-service/routes');
const mapRoutes = require('../map-service/routes');
const leaderboardRoutes = require('../leaderboard-service/routes');
const chatRoutes = require('../chat-service/routes');
const { initializeChatSocket } = require('../chat-service/socket');
const { startDailyCron } = require('../blockchain-service/cron');

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Store io instance globally for access in routes
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Rate limiting
app.use(standardRateLimit);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    service: 'Territory Run API'
  });
});

// Mount service routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/run', runRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/chat', chatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize Socket.IO for chat
initializeChatSocket(io);

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Test Redis connection
    await testRedis();
    
    // Start blockchain cron job
    startDailyCron();
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Territory Run API running on port ${PORT}`);
      logger.info(`📡 Socket.IO enabled for real-time features`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  httpServer.close(() => {
    mongoose.connection.close();
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();

module.exports = app;
