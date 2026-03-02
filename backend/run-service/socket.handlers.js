const jwt = require('jsonwebtoken');
const { redis } = require('../config/redis');
const { Territory } = require('../core/schema');
const { gpsToHex } = require('./h3.service');

const EMIT_INTERVAL_MS = 3000;
const MAX_POINTS_PER_RUN = 500;
const MAX_RUN_DURATION_MS = 4 * 60 * 60 * 1000;

function authenticateSocket(socket) {
	const token = socket.handshake.auth?.token;
	if (!token) return null;
	try {
		return jwt.verify(token, process.env.JWT_SECRET);
	} catch {
		return null;
	}
}

let ioInstance = null;

function initSocketHandlers(io) {
	ioInstance = io;

	io.use((socket, next) => {
		const user = authenticateSocket(socket);
		if (!user) return next(new Error('Unauthorized'));
		socket.user = user;
		next();
	});

	io.on('connection', async (socket) => {
		const userId = socket.user.userId || socket.user.sub;
		const username = socket.user.username;
		const userColor = socket.user.color;
		socket.join(`user:${userId}`);

		// Track user as online
		const userRecord = JSON.stringify({ userId, username, userColor, socketId: socket.id, namespace: 'main' });
		const result = await redis.sadd('online_users', userRecord);
		console.log(`[Presence] Added ${username} to online_users (main). Status: ${result}. Record: ${userRecord}`);

		socket.on('run_start', (data) => {
			socket.runId = data.runId;
			socket.runStartedAt = Date.now();
			socket.gpsPointCount = 0;
		});

		socket.on('join_map_zone', (hexId) => socket.join(`zone:${hexId}`));
		socket.on('leave_map_zone', (hexId) => socket.leave(`zone:${hexId}`));

		// On disconnect, remove user from online list
		socket.on('disconnect', async () => {
			const userRecord = JSON.stringify({ userId, username, userColor, socketId: socket.id, namespace: 'main' });
			const result = await redis.srem('online_users', userRecord);
			console.log(`[Presence] Removed ${username} from online_users (main). Status: ${result}`);
		});

		socket.on('gps_update', async (data) => {
			try {
				await handleGpsUpdate(socket, io, userId, data);
			} catch (error) {
				socket.emit('error', { message: error.message });
			}
		});
	});
}

async function handleGpsUpdate(socket, io, userId, data) {
	if (!socket.runId) {
		socket.emit('error', { message: 'No active run. Call run_start first.' });
		return;
	}

	if (Date.now() - socket.runStartedAt > MAX_RUN_DURATION_MS) {
		socket.emit('run_auto_ended', { reason: '4 hour limit reached' });
		return;
	}

	if (socket.gpsPointCount >= MAX_POINTS_PER_RUN) {
		socket.emit('error', { message: 'GPS point limit reached (500/run)' });
		return;
	}

	const rateLimitKey = `gps:rate:${userId}`;
	const lastTs = await redis.get(rateLimitKey);
	if (lastTs && Date.now() - Number(lastTs) < EMIT_INTERVAL_MS) return;
	await redis.set(rateLimitKey, Date.now(), { ex: 10 });

	if (typeof data?.lat !== 'number' || typeof data?.lng !== 'number') {
		socket.emit('gps_rejected', { reason: 'lat/lng must be numbers' });
		return;
	}
	if (data.accuracy !== undefined && data.accuracy > 50) {
		socket.emit('gps_rejected', { reason: 'accuracy exceeds 50m limit' });
		return;
	}

	const hexId = gpsToHex(data.lat, data.lng);
	socket.gpsPointCount += 1;

	const runBufferKey = `run:gps:${socket.runId}`;
	await redis.rpush(runBufferKey, JSON.stringify({
		lat: data.lat,
		lng: data.lng,
		accuracy: data.accuracy,
		timestamp: data.timestamp || Date.now(),
	}));
	await redis.expire(runBufferKey, 5 * 60 * 60);

	const territory = await Territory.findOne({ hexId }).lean().select('ownerId ownerColor ownerUsername');

	io.to(`zone:${hexId}`).emit('live_runner', {
		hexId,
		runnerColor: socket.user.color || null,
		runnerId: userId,
		currentOwner: territory
			? {
				id: territory.ownerId,
				color: territory.ownerColor,
				username: territory.ownerUsername,
			}
			: null,
		ts: Date.now(),
	});

	socket.emit('gps_ack', {
		hexId,
		pointNumber: socket.gpsPointCount,
		currentOwner: territory?.ownerUsername || null,
		willInvade: territory && territory.ownerId.toString() !== userId,
	});
}

function broadcastTerritoryChanges(io, changedHexIds, changes) {
	for (const { hexId, newOwnerColor, newOwnerUsername } of changes) {
		io.to(`zone:${hexId}`).emit('territory_changed', {
			hexId,
			newOwnerColor,
			newOwnerUsername,
			ts: Date.now(),
		});
	}
}

function getIO() {
	return ioInstance;
}

module.exports = {
	initSocketHandlers,
	handleGpsUpdate,
	broadcastTerritoryChanges,
	getIO,
};
