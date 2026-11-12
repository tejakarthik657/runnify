// backend/api-gateway/index.js
// BUNK API Gateway & Realtime Services
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const bunkRoutes = require('../bunk-service');
const authRoutes = require('../auth-service/routes');
const { connectDB } = require('../config/db');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'https://runnify-ktk.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean).map(url => url.replace(/\/$/, ''));

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o)) || origin.includes('localhost')) {
      return callback(null, true);
    }
    return callback(null, true); // Dev permissive
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'BUNK Campus Universe',
    node: 'KITSW-Warangal',
    timestamp: new Date().toISOString()
  });
});

// Bunk Campus API
app.use('/api/bunk', bunkRoutes);
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  connectDB().catch((error) => {
    console.error('[BUNK] Database connection failed:', error.message);
    process.exitCode = 1;
  });
  server.listen(PORT, () => {
    console.log(`[BUNK] Backend Gateway online on port ${PORT}`);
    console.log(`[BUNK] Campus node: KITSW-Warangal`);
  });
}

module.exports = { app, server };
