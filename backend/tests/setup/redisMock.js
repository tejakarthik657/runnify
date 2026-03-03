const sets = new Map();

const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    sadd: jest.fn().mockImplementation(async (key, val) => {
        if (!sets.has(key)) sets.set(key, new Set());
        sets.get(key).add(val);
        return 1;
    }),
    sAdd: jest.fn().mockImplementation(async (key, val) => {
        if (!sets.has(key)) sets.set(key, new Set());
        sets.get(key).add(val);
        return 1;
    }),
    srem: jest.fn().mockResolvedValue(1),
    sRem: jest.fn().mockResolvedValue(1),
    scard: jest.fn().mockImplementation(async (key) => {
        return sets.has(key) ? sets.get(key).size : 0;
    }),
    sCard: jest.fn().mockImplementation(async (key) => {
        return sets.has(key) ? sets.get(key).size : 0;
    }),
    smembers: jest.fn().mockImplementation(async (key) => {
        return sets.has(key) ? Array.from(sets.get(key)) : [];
    }),
    sMembers: jest.fn().mockImplementation(async (key) => {
        return sets.has(key) ? Array.from(sets.get(key)) : [];
    }),
    // ... rest same
    rpush: jest.fn().mockResolvedValue(1),
    rPush: jest.fn().mockResolvedValue(1),
    lrange: jest.fn().mockResolvedValue([]),
    lRange: jest.fn().mockResolvedValue([]),
    ping: jest.fn().mockResolvedValue('PONG'),
    pipeline: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([])
    }),
};

// Also mock the Redis class constructor for @upstash/redis
class MockRedisClass {
    constructor() {
        return mockRedis;
    }
}

module.exports = {
    redis: mockRedis,
    cache: {
        get: jest.fn().mockImplementation((k) => mockRedis.get(k)),
        set: jest.fn().mockImplementation((k, v) => mockRedis.set(k, v)),
        del: jest.fn().mockImplementation((k) => mockRedis.del(k)),
        incr: jest.fn().mockImplementation((k) => mockRedis.incr(k)),
        exists: jest.fn().mockImplementation((k) => mockRedis.exists(k)),
    },
    connectRedis: jest.fn().mockResolvedValue(mockRedis),
    getRedis: jest.fn().mockReturnValue(mockRedis),
    Redis: MockRedisClass
};
