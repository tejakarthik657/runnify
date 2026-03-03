// tests/anticheat.scenarios.test.js
const request = require('supertest');
const { app } = require('../api-gateway/index');
const testDb = require('./setup/testDb');
const { mockRedis } = require('./setup/mockRedis');
const { latLngToCell } = require('h3-js');

// ── GPS Tracks ────────────────────────────────────────────

const CAR_CHEAT_TRACK = (() => {
    const points = [];
    let lat = 17.4500;
    let lng = 78.5000;
    let time = Date.now() - (30 * 3000);
    for (let i = 0; i < 30; i++) {
        lat += 0.00045; // 50m per step = 60 km/h
        points.push({
            lat: parseFloat(lat.toFixed(6)),
            lng: parseFloat(lng.toFixed(6)),
            accuracy: 3,
            ts: new Date(time).toISOString(),
            timestamp: time,
        });
        time += 3000;
    }
    return points;
})();

const TELEPORT_TRACK = (() => {
    const now = Date.now();
    return [
        { lat: 17.4100, lng: 78.4500, accuracy: 5, ts: new Date(now - 12000).toISOString(), timestamp: now - 12000 },
        { lat: 17.4101, lng: 78.4502, accuracy: 5, ts: new Date(now - 9000).toISOString(), timestamp: now - 9000 },
        { lat: 28.6139, lng: 77.2090, accuracy: 5, ts: new Date(now - 6000).toISOString(), timestamp: now - 6000 }, // Delhi
        { lat: 28.6140, lng: 77.2091, accuracy: 5, ts: new Date(now - 3000).toISOString(), timestamp: now - 3000 },
    ];
})();

const DRIVEBY_TRACK = (() => {
    const points = [];
    let lat = 17.4300;
    let lng = 78.4700;
    let time = Date.now() - (35 * 1500);
    for (let i = 0; i < 35; i++) {
        lat += 0.00020;
        points.push({
            lat: parseFloat(lat.toFixed(6)),
            lng: parseFloat(lng.toFixed(6)),
            accuracy: 5,
            ts: new Date(time).toISOString(),
            timestamp: time,
        });
        time += 1500;
    }
    return points;
})();

// ── Helper ────────────────────────────────────────────────

async function pushPointsToRedis(runId, track) {
    const bufferKey = `run:gps:${runId}`;
    for (const point of track) {
        await mockRedis.rPush(bufferKey, JSON.stringify({
            lat: point.lat,
            lng: point.lng,
            accuracy: point.accuracy || 5,
            altitude: 540,
            ts: point.ts || new Date(point.timestamp).toISOString(),
            timestamp: point.timestamp || Date.now(),
            hexId: latLngToCell(point.lat, point.lng, 9),
        }));
    }
    const count = await mockRedis.lLen(bufferKey);
    console.log(`[TEST] Pushed ${count} points for run ${runId}`);
    return count;
}

// ── Helper: register a fresh user and return token ────────

async function registerAndLogin(suffix) {
    const ts = Date.now();
    const email = `cheater_${suffix}_${ts}@test.com`;
    const password = 'Test123!';

    const reg = await request(app)
        .post('/auth/register')
        .send({
            username: `t_${suffix}_${String(ts).slice(-6)}`,
            email,
            password,
            city: 'Hyderabad',
        });

    if (reg.status !== 201) {
        throw new Error(`Registration failed: ${JSON.stringify(reg.body)}`);
    }

    const login = await request(app)
        .post('/auth/login')
        .send({ email, password });

    if (login.status !== 200) {
        throw new Error(`Login failed: ${JSON.stringify(login.body)}`);
    }

    return {
        token: login.body.accessToken,
        userId: login.body.user?.id || reg.body.user?.id,
    };
}

// ── Setup ─────────────────────────────────────────────────

beforeAll(async () => {
    await testDb.connect();
});

afterAll(async () => {
    await testDb.closeDatabase();
});

// KEY FIX: clear DB and Redis THEN re-create user fresh for each test
// This ensures the user always exists when their token is used
beforeEach(async () => {
    await testDb.clearDatabase();
    mockRedis._clear();
});

// ── Tests ─────────────────────────────────────────────────

test('Car Cheat: 60km/h run is disqualified', async () => {
    // Register fresh user AFTER clearDatabase
    const { token } = await registerAndLogin('car');

    const startRes = await request(app)
        .post('/run/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
            startPos: { lat: CAR_CHEAT_TRACK[0].lat, lng: CAR_CHEAT_TRACK[0].lng },
        });

    expect(startRes.status).toBe(201);

    const runId = startRes.body.run?._id
        || startRes.body.run?.id
        || startRes.body.runId;

    expect(runId).toBeTruthy();

    const pushed = await pushPointsToRedis(runId, CAR_CHEAT_TRACK);
    expect(pushed).toBe(CAR_CHEAT_TRACK.length);

    const endRes = await request(app)
        .post(`/run/${runId}/end`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

    console.log('[CAR] verdict:', endRes.body.run?.antiCheat?.verdict);
    console.log('[CAR] flags:', JSON.stringify(endRes.body.run?.antiCheat?.flags));
    console.log('[CAR] credits:', endRes.body.summary?.creditsEarned);

    expect(endRes.status).toBe(200);
    expect(endRes.body.run.antiCheat.verdict).toBe('disqualified');
    expect(endRes.body.summary.creditsEarned).toBe(0);
});

test('Teleport: Impossible velocity is disqualified', async () => {
    const { token } = await registerAndLogin('teleport');

    const startRes = await request(app)
        .post('/run/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
            startPos: { lat: TELEPORT_TRACK[0].lat, lng: TELEPORT_TRACK[0].lng },
        });

    expect(startRes.status).toBe(201);

    const runId = startRes.body.run?._id
        || startRes.body.run?.id
        || startRes.body.runId;

    expect(runId).toBeTruthy();

    const pushed = await pushPointsToRedis(runId, TELEPORT_TRACK);
    expect(pushed).toBe(TELEPORT_TRACK.length);

    const endRes = await request(app)
        .post(`/run/${runId}/end`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

    console.log('[TELEPORT] verdict:', endRes.body.run?.antiCheat?.verdict);
    console.log('[TELEPORT] flags:', JSON.stringify(endRes.body.run?.antiCheat?.flags));

    expect(endRes.status).toBe(200);
    expect(endRes.body.run.antiCheat.verdict).toBe('disqualified');
});

test('Drive-by: Hexes with < 8s dwell time are filtered out', async () => {
    const { token } = await registerAndLogin('driveby');

    const startRes = await request(app)
        .post('/run/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
            startPos: { lat: DRIVEBY_TRACK[0].lat, lng: DRIVEBY_TRACK[0].lng },
        });

    expect(startRes.status).toBe(201);

    const runId = startRes.body.run?._id
        || startRes.body.run?.id
        || startRes.body.runId;

    expect(runId).toBeTruthy();

    await pushPointsToRedis(runId, DRIVEBY_TRACK);

    const endRes = await request(app)
        .post(`/run/${runId}/end`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

    console.log('[DRIVEBY] hexesClaimed:', endRes.body.summary?.hexesClaimed);
    console.log('[DRIVEBY] verdict:', endRes.body.run?.antiCheat?.verdict);

    expect(endRes.status).toBe(200);
    expect(endRes.body.summary.hexesClaimed).toBe(0);
});