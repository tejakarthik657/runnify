const jwt = require('jsonwebtoken');
const { redis } = require('../config/redis');
const { Territory } = require('../core/schema');
const { gpsToHex } = require('./h3.service');

const EMIT_INTERVAL_MS = 1000;
const MAX_POINTS_PER_RUN = 500;
const MAX_RUN_DURATION_MS = 4 * 60 * 60 * 1000;
const MIN_ACCURACY_METERS = 30;
const MIN_MOVEMENT_METERS = 5;

function haversineMeters(lat1, lon1, lat2, lon2) {
	const R = 6371000;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

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

		socket.on('run_start', async (data) => {
			socket.runId = data.runId;
			socket.runStartedAt = Date.now();
			socket.gpsPointCount = 0;
			socket.lastAcceptedGpsPoint = null;

			// Mark user as actively running in Redis
			await redis.set(`user:running:${userId}`, 'true', { ex: 2 * 60 * 60 }); // 2h expiry
		});

		socket.on('join_map_zone', (hexId) => socket.join(`zone:${hexId}`));
		socket.on('leave_map_zone', (hexId) => socket.leave(`zone:${hexId}`));

		// On disconnect, remove user from online list and running status
		socket.on('disconnect', async () => {
			const userRecord = JSON.stringify({ userId, username, userColor, socketId: socket.id, namespace: 'main' });
			await Promise.all([
				redis.srem('online_users', userRecord),
				redis.del(`user:running:${userId}`),
				redis.del(`user:live:pos:${userId}`)
			]);
			console.log(`[Presence] Cleanup for ${username}`);
		});

		socket.on('gps_update', async (data) => {
			try {
				await handleGpsUpdate(socket, io, userId, data);
			} catch (error) {
				socket.emit('error', { message: error.message });
			}
		});

		socket.on('presence_sync', async (data) => {
			try {
				await handlePresenceSync(socket, io, userId, data);
			} catch (error) {
				// Silent fail for heartbeats
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
	if (data.accuracy !== undefined && data.accuracy > MIN_ACCURACY_METERS) {
		socket.emit('gps_rejected', { reason: `accuracy exceeds ${MIN_ACCURACY_METERS}m limit` });
		return;
	}

	if (socket.lastAcceptedGpsPoint) {
		const dist = haversineMeters(
			socket.lastAcceptedGpsPoint.lat,
			socket.lastAcceptedGpsPoint.lng,
			data.lat,
			data.lng
		);
		if (dist < MIN_MOVEMENT_METERS) {
			socket.emit('gps_rejected', { reason: `movement below ${MIN_MOVEMENT_METERS}m threshold` });
			return;
		}
	}

	socket.lastAcceptedGpsPoint = { lat: data.lat, lng: data.lng };

	const hexId = gpsToHex(data.lat, data.lng);
	const { latLngToCell, gridDisk } = require('h3-js');
	const res6Hex = latLngToCell(data.lat, data.lng, 6); // Broad broadcast zone
	const broadcastZones = gridDisk(res6Hex, 1); // 7 zones

	socket.gpsPointCount += 1;

	const runBufferKey = `run:gps:${socket.runId}`;
	const livePosKey = `user:live:pos:${userId}`;
	const ts = Date.now();

	await Promise.all([
		redis.rpush(runBufferKey, JSON.stringify({
			lat: data.lat,
			lng: data.lng,
			accuracy: data.accuracy,
			timestamp: data.timestamp || ts,
		})),
		redis.set(livePosKey, JSON.stringify({
			lat: data.lat,
			lng: data.lng,
			ts
		}), { ex: 60 }) // 60s TTL for live position
	]);

	await redis.expire(runBufferKey, 5 * 60 * 60);

	// Persistent tracking & Broadcast
	await broadcastUserLocation(io, socket, userId, data, hexId);

	// Fetch territory ownership if it exists
	const territory = await Territory.findOne({ hexId }).select('ownerId ownerUsername').lean();

	socket.emit('gps_ack', {
		hexId,
		pointNumber: socket.gpsPointCount,
		currentOwner: territory?.ownerUsername || null,
		willInvade: territory && territory.ownerId.toString() !== userId.toString(),
	});
}

async function handlePresenceSync(socket, io, userId, data) {
	if (typeof data?.lat !== 'number' || typeof data?.lng !== 'number') return;
	if (data.accuracy !== undefined && data.accuracy > MIN_ACCURACY_METERS) return;

	const { latLngToCell } = require('h3-js');
	const hexId = latLngToCell(data.lat, data.lng, 9);

	await broadcastUserLocation(io, socket, userId, data, hexId);
}

async function broadcastUserLocation(io, socket, userId, data, hexId) {
	const { latLngToCell, gridDisk } = require('h3-js');
	const res6Hex = latLngToCell(data.lat, data.lng, 6);
	const broadcastZones = gridDisk(res6Hex, 1);
	const ts = Date.now();

	// Update Redis Live Cache
	const livePosKey = `user:live:pos:${userId}`;
	await redis.set(livePosKey, JSON.stringify({
		lat: data.lat,
		lng: data.lng,
		accuracy: data.accuracy,
		ts
	}), { ex: 60 });

	const payload = {
		userId,
		username: socket.user.username,
		userColor: socket.user.color || null,
		lat: data.lat,
		lng: data.lng,
		hexId,
		ts,
	};

	// Broadcast to local zones
	broadcastZones.forEach(zone => {
		io.to(`zone:${zone}`).emit('live_runner', payload);
	});

	// Global broadcast (minimal payload)
	io.emit('global_live_runner', {
		userId,
		username: socket.user.username,
		userColor: socket.user.color,
		lat: data.lat,
		lng: data.lng,
		ts
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
