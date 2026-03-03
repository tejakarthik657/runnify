const request = require('supertest');
const { app, server } = require('./setup/testApp');
const testDb = require('./setup/testDb');
const { setupUser } = require('./setup/testUsers');
const { HYDERABAD_TRACK } = require('./setup/testTracks');
const io = require('socket.io-client');
const { mockRedis } = require('./setup/mockRedis');
const { latLngToCell } = require('h3-js');

describe('TerritoryRun - Two-User GPS Simulation', () => {
    let userA, userB;
    let socketA, socketB;
    let runningServer;
    let baseUrl;

    beforeAll(async () => {
        await testDb.connect();
        runningServer = server.listen(0);
        const port = runningServer.address().port;
        baseUrl = `http://localhost:${port}`;
    });

    afterAll(async () => {
        if (socketA) socketA.disconnect();
        if (socketB) socketB.disconnect();
        if (runningServer) {
            await new Promise((resolve) => runningServer.close(resolve));
        }
        await testDb.closeDatabase();
    });

    beforeEach(async () => {
        await testDb.clearDatabase();
        mockRedis._clear();
    });

    test('User A clean run: start, socket stream, and end verification', async () => {
        userA = await setupUser({ username: 'runnerA', email: 'a@test.com' });

        const startRes = await request(app)
            .post('/run/start')
            .set('Authorization', `Bearer ${userA.token}`)
            .send({ lat: 17.385, lng: 78.486 });

        expect(startRes.status).toBe(201);
        const runId = startRes.body.run?._id || startRes.body.runId; // fallback for safety

        socketA = io(baseUrl, { auth: { token: userA.token } });

        await new Promise((resolve) => {
            socketA.on('connect', () => {
                socketA.emit('run_start', { runId });
                resolve();
            });
        });

        const ackPromise = new Promise((resolve) => {
            let count = 0;
            socketA.on('gps_ack', () => {
                count++;
                if (count === 2) resolve();
            });
        });

        const now = Date.now();
        socketA.emit('gps_update', {
            runId, lat: 17.386, lng: 78.487, ts: now - 3000, accuracy: 10
        });
        socketA.emit('gps_update', {
            runId, lat: 17.387, lng: 78.488, ts: now, accuracy: 10
        });

        await ackPromise;

        // Push User A's clean track to Redis
        const bufferKey = `run:gps:${runId}`;
        await mockRedis.del(bufferKey);

        const CLEAN_TRACK = [];
        for (let i = 0; i < 10; i++) {
            CLEAN_TRACK.push({
                lat: 17.385 + (i * 0.00006),
                lng: 78.486 + (i * 0.00006),
                timestamp: now - (30000 - i * 3000)
            });
        }

        for (const point of CLEAN_TRACK) {
            await mockRedis.rpush(bufferKey, JSON.stringify({
                lat: point.lat,
                lng: point.lng,
                accuracy: 8,
                altitude: 540,
                ts: new Date(point.timestamp).toISOString(),
                timestamp: point.timestamp,
                hexId: latLngToCell(point.lat, point.lng, 9),
            }));
        }

        const endRes = await request(app)
            .post(`/run/${runId}/end`)
            .set('Authorization', `Bearer ${userA.token}`)
            .send({
                lat: 17.3895,
                lng: 78.4905
            });

        expect(endRes.status).toBe(200);
        expect(endRes.body.summary.distanceKm).toBeGreaterThan(0);
        expect(endRes.body.summary.creditsEarned).toBeGreaterThan(0);
    });

    test('User B invades User A territory', async () => {
        userB = await setupUser({ username: 'invaderB', email: 'b@test.com' });

        const startRes = await request(app)
            .post('/run/start')
            .set('Authorization', `Bearer ${userB.token}`)
            .send({ lat: 17.385, lng: 78.486 });

        expect(startRes.status).toBe(201);
        const runId = startRes.body.run?._id || startRes.body.runId;

        const endRes = await request(app)
            .post(`/run/${runId}/end`)
            .set('Authorization', `Bearer ${userB.token}`)
            .send({
                points: HYDERABAD_TRACK,
                isSimulated: true
            });

        expect(endRes.status).toBe(200);
    });
});
