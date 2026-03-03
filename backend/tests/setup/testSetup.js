// tests/setup/testSetup.js
// Runs before every test file
// Mocks Redis and MongoDB so tests never need real connections

const { mockRedis } = require('./mockRedis');

// ── Mock Upstash Redis ────────────────────────────────────
// Must be before any require of config/redis
jest.mock('@upstash/redis', () => ({
    Redis: jest.fn().mockImplementation(() => mockRedis),
}));

// Also mock the config/redis module directly
jest.mock('../../config/redis', () => ({
    connectRedis: jest.fn().mockResolvedValue(true),
    getRedis: jest.fn().mockReturnValue(mockRedis),
    redis: mockRedis,
}));

// ── Mock rate limiters (they use Redis) ───────────────────
jest.mock('../../middleware/rateLimit', () => {
    const mockLimiter = (req, res, next) => next();
    return {
        standardRateLimit: mockLimiter,
        authRateLimit: mockLimiter,
        gpsRateLimit: mockLimiter,
        aiRateLimit: mockLimiter,
        blockchainRateLimit: mockLimiter,
        createCustomRateLimit: () => mockLimiter,
        initLimiters: jest.fn().mockReturnValue({}),
        getLimiters: jest.fn().mockReturnValue({
            standard: mockLimiter,
            auth: mockLimiter,
            gps: mockLimiter,
            ai: mockLimiter,
            blockchain: mockLimiter,
        }),
    };
});

// ── Mock blockchain (never send real TXs in tests) ────────
jest.mock('ethers', () => ({
    ethers: {
        JsonRpcProvider: jest.fn(),
        Wallet: jest.fn().mockImplementation(() => ({
            address: '0xTestWalletAddress',
            sendTransaction: jest.fn().mockResolvedValue({
                hash: '0xMockTxHash123',
                wait: jest.fn().mockResolvedValue({ status: 1 }),
            }),
        })),
    },
}));

// ── Reset Redis mock data between each test ───────────────
beforeEach(() => {
    mockRedis._clear();
});
