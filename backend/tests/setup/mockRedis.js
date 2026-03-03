// tests/setup/mockRedis.js
// In-memory Redis mock — replaces Upstash in all tests
// Supports: get, set, del, rPush, lRange, lLen, keys, expire, incr, exists, sAdd, sCard, sMembers

const store = new Map();
const lists = new Map();
const sets = new Map();

const mockRedis = {
    // String operations
    get: jest.fn(async (key) => store.get(key) ?? null),

    set: jest.fn(async (key, value, ...args) => {
        store.set(key, value);
        return 'OK';
    }),

    del: jest.fn(async (...keys) => {
        const flatKeys = keys.flat();
        let count = 0;
        flatKeys.forEach(k => {
            if (store.delete(k) || lists.delete(k) || sets.delete(k)) count++;
        });
        return count;
    }),

    exists: jest.fn(async (key) => store.has(key) || lists.has(key) || sets.has(key) ? 1 : 0),

    expire: jest.fn(async () => 1),

    incr: jest.fn(async (key) => {
        const val = parseInt(store.get(key) || '0') + 1;
        store.set(key, String(val));
        return val;
    }),

    incrBy: jest.fn(async (key, amount) => {
        const val = parseInt(store.get(key) || '0') + amount;
        store.set(key, String(val));
        return val;
    }),

    // List operations
    rPush: jest.fn(async (key, ...values) => {
        if (!lists.has(key)) lists.set(key, []);
        const flatVals = values.flat();
        lists.get(key).push(...flatVals);
        return lists.get(key).length;
    }),

    rpush: jest.fn(async (key, ...values) => {
        return mockRedis.rPush(key, ...values);
    }),

    lPush: jest.fn(async (key, ...values) => {
        if (!lists.has(key)) lists.set(key, []);
        const flatVals = values.flat();
        lists.get(key).unshift(...flatVals);
        return lists.get(key).length;
    }),

    lpush: jest.fn(async (key, ...values) => {
        return mockRedis.lPush(key, ...values);
    }),

    lRange: jest.fn(async (key, start, end) => {
        const list = lists.get(key) || [];
        const actualEnd = end === -1 ? list.length : end + 1;
        return list.slice(start, actualEnd);
    }),

    lrange: jest.fn(async (key, start, end) => {
        return mockRedis.lRange(key, start, end);
    }),

    lLen: jest.fn(async (key) => {
        return (lists.get(key) || []).length;
    }),

    llen: jest.fn(async (key) => {
        return mockRedis.lLen(key);
    }),

    // Set operations
    sAdd: jest.fn(async (key, ...members) => {
        if (!sets.has(key)) sets.set(key, new Set());
        const set = sets.get(key);
        const flatMembers = members.flat();
        let added = 0;
        flatMembers.forEach(m => {
            if (!set.has(m)) {
                set.add(m);
                added++;
            }
        });
        return added;
    }),

    sadd: jest.fn(async (key, ...members) => {
        return mockRedis.sAdd(key, ...members);
    }),

    sCard: jest.fn(async (key) => {
        return sets.has(key) ? sets.get(key).size : 0;
    }),

    scard: jest.fn(async (key) => {
        return mockRedis.sCard(key);
    }),

    sRem: jest.fn(async (key, ...members) => {
        if (!sets.has(key)) return 0;
        const set = sets.get(key);
        const flatMembers = members.flat();
        let removed = 0;
        flatMembers.forEach(m => {
            if (set.delete(m)) {
                removed++;
            }
        });
        return removed;
    }),

    srem: jest.fn(async (key, ...members) => {
        return mockRedis.sRem(key, ...members);
    }),

    sMembers: jest.fn(async (key) => {
        return sets.has(key) ? Array.from(sets.get(key)) : [];
    }),

    smembers: jest.fn(async (key) => {
        return mockRedis.sMembers(key);
    }),

    // Pattern matching for keys
    keys: jest.fn(async (pattern) => {
        const allKeys = [...store.keys(), ...lists.keys(), ...sets.keys()];
        if (pattern === '*') return allKeys;
        // Convert glob pattern to regex
        const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
        );
        return allKeys.filter(k => regex.test(k));
    }),

    // Pipeline/multi support (simplified)
    pipeline: jest.fn(() => {
        const cmds = [];
        const pipe = {
            rPush: (...args) => { cmds.push(['rPush', ...args]); return pipe; },
            rpush: (...args) => { cmds.push(['rPush', ...args]); return pipe; },
            set: (...args) => { cmds.push(['set', ...args]); return pipe; },
            exec: async () => {
                const results = [];
                for (const [cmd, ...args] of cmds) {
                    results.push(await mockRedis[cmd](...args));
                }
                return results;
            },
        };
        return pipe;
    }),

    // Clear all data between tests
    _clear: () => {
        store.clear();
        lists.clear();
        sets.clear();
        // Reset all mock call counts
        Object.values(mockRedis).forEach(fn => {
            if (fn && fn.mockClear) fn.mockClear();
        });
    },
};

module.exports = { mockRedis };
