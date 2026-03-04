const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const { gpsRateLimit } = require('../middleware/rateLimit');
const { Run, User } = require('../core/schema');
const { RunService } = require('../core/services');
const { broadcastTerritoryChanges, getIO } = require('./socket.handlers');

const router = express.Router();

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
		const { lat, lng } = req.body;
		// Extract client IP (from proxy headers or direct)
		const requestIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '0.0.0.0';
		// Extract optional client metadata for anti-cheat
		const clientMeta = {
			isMockLocation: req.body.isMockLocation === true,
			clientVersion: req.body.clientVersion || null,
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
		if (io && req.userId) {
			const user = await User.findById(req.userId).select('credits username city').lean();
			if (user) {
				// Emit stats update for this user
				io.to(`user:${req.userId}`).emit('user_stats_update', {
					userId: req.userId,
					credits: user.credits,
					distanceKm: result.summary?.distanceKm,
					hexesClaimed: result.summary?.hexesClaimed
				});

				// Emit global leaderboard update
				io.emit('leaderboard_update', {
					userId: req.userId,
					updates: {
						credits: user.credits,
						username: user.username,
						lastRunTime: new Date()
					}
				});

				// Emit rank update
				const usersAbove = await User.countDocuments({ credits: { $gt: user.credits }, isBanned: false });
				io.to(`user:${req.userId}`).emit('rank_update', {
					userId: req.userId,
					rank: usersAbove + 1
				});
			}
		}

		res.json(result);
	} catch (error) {
		next(error);
	}
});

router.post('/end', authenticateJWT, async (req, res, next) => {
	try {
		const { runId, lat, lng } = req.body;
		if (!runId) return res.status(400).json({ error: 'runId required' });
		// Extract client IP (from proxy headers or direct)
		const requestIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '0.0.0.0';
		// Extract optional client metadata for anti-cheat
		const clientMeta = {
			isMockLocation: req.body.isMockLocation === true,
			clientVersion: req.body.clientVersion || null,
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
		if (io && req.userId) {
			const user = await User.findById(req.userId).select('credits username city').lean();
			if (user) {
				// Emit stats update for this user
				io.to(`user:${req.userId}`).emit('user_stats_update', {
					userId: req.userId,
					credits: user.credits,
					distanceKm: result.summary?.distanceKm,
					hexesClaimed: result.summary?.hexesClaimed
				});

				// Emit global leaderboard update
				io.emit('leaderboard_update', {
					userId: req.userId,
					updates: {
						credits: user.credits,
						username: user.username,
						lastRunTime: new Date()
					}
				});

				// Emit rank update
				const usersAbove = await User.countDocuments({ credits: { $gt: user.credits }, isBanned: false });
				io.to(`user:${req.userId}`).emit('rank_update', {
					userId: req.userId,
					rank: usersAbove + 1
				});
			}
		}

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

router.get('/:id', authenticateJWT, async (req, res, next) => {
	try {
		const run = await Run.findOne({ _id: req.params.id, userId: req.userId });
		if (!run) return res.status(404).json({ error: 'Run not found' });
		res.json({ run });
	} catch (error) {
		next(error);
	}
});

module.exports = router;
