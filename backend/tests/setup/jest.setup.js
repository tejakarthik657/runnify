// Increase timeout for all tests (useful for MongoMemoryServer startup/download)
jest.setTimeout(600000); // 10 minutes for the first run (binary download)

// Environment variables for testing
process.env.JWT_SECRET = 'test-secret-key-12345';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-12345';
process.env.NODE_ENV = 'test';

// Mock Upstash Redis defaults (though we should mock the module)
process.env.UPSTASH_REDIS_URL = 'https://mock-redis.upstash.io';
process.env.UPSTASH_REDIS_TOKEN = 'mock-token';
