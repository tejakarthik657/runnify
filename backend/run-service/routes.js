const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const { gpsRateLimit } = require('../middleware/rateLimit');
const { Run, User } = require('../core/schema');
const { RunService, LeaderboardService } = require('../core/services');
const { broadcastTerritoryChanges, getIO } = require('./socket.handlers');

const router = express.Router();

async function emitPostRunRealtime(io, userId, result) {
	if (!io || !userId) return;

	const user = await User.findById(userId)
		.select('credits username city faction hexesOwned globalRank cityRank stats color')
		.lean();
	if (!user) return;

	io.to(`user:${userId}`).emit('user_stats_update', {
		userId,
		credits: user.credits,
		hexesOwned: user.hexesOwned,
		globalRank: user.globalRank,
		cityRank: user.cityRank,
		stats: user.stats,
		distanceKm: result.summary?.distanceKm,
		hexesClaimed: result.summary?.hexesClaimed,
		lastRunTime: new Date(),
	});

	io.emit('leaderboard_update', {
		userId,
		updates: {
			rank: user.globalRank,
			credits: user.credits,
			hexesOwned: user.hexesOwned,
			totalKm: user.stats?.totalKm || 0,
			username: user.username,
			city: user.city,
			lastRunTime: new Date(),
		}
	});

	io.to(`user:${userId}`).emit('rank_update', {
		userId,
		rank: user.globalRank,
		cityRank: user.cityRank,
	});

	try {
		const globalEntries = await LeaderboardService.get('global');
		io.emit('leaderboard_refresh', { scope: 'global', entries: globalEntries });
		if (user.city) {
			const cityEntries = await LeaderboardService.get('city', user.city);
			io.emit('leaderboard_refresh', { scope: 'city', city: user.city, entries: cityEntries });
		}
	} catch (err) {
		console.warn('[Realtime] leaderboard_refresh emit failed:', err.message);
	}

	if (user.faction) {
		io.emit('faction_updated', {
			faction: user.faction,
			hexesClaimed: result.summary?.hexesClaimed || 0,
			city: user.city,
			username: user.username,
		});
	}
}

router.post('/start', authenticateJWT, async (req, res, next) => {
	try {
		const bodyLat = Number(req.body?.lat);
		const bodyLng = Number(req.body?.lng);
		const posLat = Number(req.body?.startPos?.lat);
		const posLng = Number(req.body?.startPos?.lng);

		let lat = Number.isFinite(bodyLat) ? bodyLat : (Number.isFinite(posLat) ? posLat : null);
		let lng = Number.isFinite(bodyLng) ? bodyLng : (Number.isFinite(posLng) ? posLng : null);
		const city = req.body?.city || process.env.NEXT_PUBLIC_DEV_CITY || 'Hyderabad';

		// Fallback for DEV_MODE testing
		if ((!lat || !lng) && req.body?.devMode === true) {
			console.log('[DEV] No coordinates provided, using Hyderabad fallback');
			lat = 17.38505;
			lng = 78.48667;
		}

		if (Number.isFinite(lat) && Number.isFinite(lng)) {
			const user = await User.findById(req.userId).select('homeLocation').lean();
			const lastUpdate = user?.homeLocation?.updatedAt ? new Date(user.homeLocation.updatedAt) : null;
			const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

			if (!lastUpdate || lastUpdate < sevenDaysAgo) {
				await User.updateOne(
					{ _id: req.userId },
					{
						$set: {
							'homeLocation.lat': lat,
							'homeLocation.lng': lng,
							'homeLocation.updatedAt': new Date(),
						},
					}
				);
			}
		}

		const run = await RunService.startRun(req.userId, { lat, lng, city });
		const user = await User.findById(req.userId).select('username color').lean();
		res.status(201).json({ run, user: { username: user?.username, color: user?.color } });
	} catch (error) {
		next(error);
	}
});

router.post('/:runId/gps', authenticateJWT, gpsRateLimit, async (req, res, next) => {
	try {
		const result = await RunService.ingestGpsPoints(req.params.runId, req.userId, req.body.points || []);
		res.json(result);
	} catch (error) {
		next(error);
	}
});

router.post('/:runId/end', authenticateJWT, async (req, res, next) => {
	try {
		const { lat, lng, accelSteps } = req.body;
		// Extract client IP (from proxy headers or direct)
		const requestIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '0.0.0.0';
		// Extract optional client metadata for anti-cheat
		const clientMeta = {
			isMockLocation: req.body.isMockLocation === true,
			clientVersion: req.body.clientVersion || null,
			accelSteps: accelSteps || 0  // Pass accelerometer steps
		};
		const result = await RunService.endRun(req.params.runId, req.userId, { lat, lng }, requestIp, clientMeta);
		const { territoryChanges } = result;

		// ── Broadcast territory changes via Socket.IO ─────────────
		if (territoryChanges && territoryChanges.length > 0) {
			const io = getIO();
			if (io) broadcastTerritoryChanges(io, [], territoryChanges);
		}

		// ── Emit real-time leaderboard and stats updates ─────────────
		const io = getIO();
		await emitPostRunRealtime(io, req.userId, result);

		res.json(result);
	} catch (error) {
		next(error);
	}
});

router.post('/end', authenticateJWT, async (req, res, next) => {
	try {
		const { runId, lat, lng, accelSteps } = req.body;
		if (!runId) return res.status(400).json({ error: 'runId required' });
		// Extract client IP (from proxy headers or direct)
		const requestIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '0.0.0.0';
		// Extract optional client metadata for anti-cheat
		const clientMeta = {
			isMockLocation: req.body.isMockLocation === true,
			clientVersion: req.body.clientVersion || null,
			accelSteps: accelSteps || 0  // Pass accelerometer steps
		};
		const result = await RunService.endRun(runId, req.userId, { lat, lng }, requestIp, clientMeta);
		const { territoryChanges } = result;

		// ── Broadcast territory changes via Socket.IO ─────────────
		if (territoryChanges && territoryChanges.length > 0) {
			const io = getIO();
			if (io) broadcastTerritoryChanges(io, [], territoryChanges);
		}

		// ── Emit real-time leaderboard and stats updates ─────────────
		const io = getIO();
		await emitPostRunRealtime(io, req.userId, result);

		res.json(result);
	} catch (error) {
		next(error);
	}
});

router.get('/active', authenticateJWT, async (req, res, next) => {
	try {
		const activeRun = await Run.findOne({ userId: req.userId, isActive: true });
		res.json({ activeRun });
	} catch (error) {
		next(error);
	}
});

router.get('/history/me', authenticateJWT, async (req, res, next) => {
	try {
		const runs = await Run.find({ userId: req.userId, isActive: false })
			.sort({ endedAt: -1 })
			.limit(20);
		res.json({ runs });
	} catch (error) {
		next(error);
	}
});

router.post('/:id', authenticateJWT, async (req, res, next) => {
	try {
		const run = await Run.findOne({ _id: req.params.id, userId: req.userId });
		if (!run) return res.status(404).json({ error: 'Run not found' });
		res.json({ run });
	} catch (error) {
		next(error);
	}
});

router.post('/sync-crdt', authenticateJWT, async (req, res, next) => {
	try {
		const { operations } = req.body;
		if (!Array.isArray(operations)) {
			return res.status(400).json({ error: 'operations must be an array' });
		}

		const { Territory } = require('../core/schema');
		const mongoose = require('mongoose');
		const session = await mongoose.startSession();

		try {
			await session.withTransaction(async () => {
				for (const op of operations) {
					const existing = await Territory.findOne({ hexId: op.hexId }).session(session);
					const opTime = new Date(op.timestamp);

					if (!existing) {
						await Territory.create([{
							hexId: op.hexId,
							ownerId: op.userId,
							ownerUsername: '',
							ownerColor: '#A8D5BA',
							faction: op.faction,
							claimedAt: opTime,
							firstClaimedAt: opTime,
							lastActiveAt: opTime,
							creditValue: 10,
							decayFactor: 1.0,
							schemaVersion: 'v1',
						}], { session });
					} else if (opTime > existing.claimedAt) {
						existing.ownerId = op.userId;
						existing.faction = op.faction;
						existing.claimedAt = opTime;
						existing.lastActiveAt = opTime;
						await existing.save({ session });
					}
				}
			});

			res.json({ status: 'merged_success', merged: operations.length });
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			await session.endSession();
		}
	} catch (error) {
		next(error);
	}
});

module.exports = router;
