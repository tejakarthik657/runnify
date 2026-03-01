/**
 * Redis Configuration
 * Uses Upstash Redis for serverless/cloud deployment
 */
const { Redis } = require('@upstash/redis');
const logger = require('../utils/logger');

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN
});

/**
 * Test Redis connection
 */
async function testConnection() {
  try {
    await redis.ping();
    logger.info('✅ Redis connected successfully');
    return true;
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    return false;
  }
}

/**
 * Cache helpers
 */
const cache = {
  /**
   * Get cached value
   */
  async get(key) {
    try {
      return await redis.get(key);
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },
  
  /**
   * Set cached value with optional TTL
   */
  async set(key, value, ttlSeconds = 3600) {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  },
  
  /**
   * Delete cached value
   */
  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },
  
  /**
   * Increment counter
   */
  async incr(key, ttlSeconds = null) {
    try {
      const value = await redis.incr(key);
      if (ttlSeconds) {
        await redis.expire(key, ttlSeconds);
      }
      return value;
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      return null;
    }
  },
  
  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      return await redis.exists(key) === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }
};

// Test connection on startup
testConnection();

module.exports = {
  redis,
  cache,
  testConnection
};
