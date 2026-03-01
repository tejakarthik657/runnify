/**
 * Rate Limiting Middleware
 * Uses Redis for distributed rate limiting across multiple instances
 */
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { redis } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Standard API rate limit
 * 100 requests per 15 minutes per IP
 */
const standardRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:standard:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(15 * 60) // seconds
    });
  }
});

/**
 * Strict rate limit for auth endpoints
 * 5 requests per 15 minutes per IP
 */
const authRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many authentication attempts' },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter: Math.ceil(15 * 60)
    });
  }
});

/**
 * GPS stream rate limit
 * 360 requests per minute (6 per second)
 * Per user, not per IP
 */
const gpsRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:gps:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 360,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return req.user?.userId || req.ip;
  },
  message: { error: 'GPS update rate limit exceeded' }
});

/**
 * AI/RAG query rate limit
 * 20 requests per hour per user
 */
const aiRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:ai:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => {
    return req.user?.userId || req.wallet?.address || req.ip;
  },
  message: { error: 'AI query rate limit exceeded' },
  handler: (req, res) => {
    logger.warn(`AI rate limit exceeded for user: ${req.user?.userId || req.ip}`);
    res.status(429).json({
      error: 'AI query rate limit exceeded',
      limit: 20,
      window: '1 hour',
      retryAfter: Math.ceil(60 * 60)
    });
  }
});

/**
 * Blockchain transaction rate limit
 * 10 transactions per hour per user
 */
const blockchainRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:blockchain:'
  }),
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    return req.wallet?.address || req.user?.userId || req.ip;
  },
  message: { error: 'Blockchain transaction rate limit exceeded' }
});

/**
 * Custom rate limiter for specific use cases
 */
function createCustomRateLimit(options = {}) {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: options.prefix || 'rl:custom:'
    }),
    windowMs: options.windowMs || 60 * 1000,
    max: options.max || 60,
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    message: options.message || { error: 'Rate limit exceeded' }
  });
}

module.exports = {
  standardRateLimit,
  authRateLimit,
  gpsRateLimit,
  aiRateLimit,
  blockchainRateLimit,
  createCustomRateLimit
};
