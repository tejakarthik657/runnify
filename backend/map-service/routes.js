const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { MapService } = require('../core/services');
const {
	getTerritoriesByBbox,
	getHexDetails,
	searchTerritoryByUsername,
	searchLocationToHex,
	getCityTerritoryStats,
} = require('./territory.query');

const router = express.Router();

router.get('/territories', optionalAuth, async (req, res, next) => {
	try {
		const minLat = Number(req.query.minLat);
		const minLng = Number(req.query.minLng);
		const maxLat = Number(req.query.maxLat);
		const maxLng = Number(req.query.maxLng);
		const result = await getTerritoriesByBbox({ minLat, minLng, maxLat, maxLng });
		res.json(result);
	} catch (error) {
		next(error);
	}
});

router.get('/hex/:hexId', optionalAuth, async (req, res, next) => {
	try {
		const data = await getHexDetails(req.params.hexId);
		res.json(data);
	} catch (error) {
		next(error);
	}
});

router.get('/search', optionalAuth, async (req, res, next) => {
	try {
		const { q } = req.query;
		if (!q || q.trim().length < 2) {
			return res.status(400).json({ error: 'Query must be at least 2 characters' });
		}

		if (q.startsWith('@')) {
			const username = q.slice(1).trim();
			const result = await searchTerritoryByUsername(username);
			return res.json({ type: 'user', ...result });
		}

		const result = await searchLocationToHex(q.trim());
		res.json({ type: 'location', ...result });
	} catch (error) {
		next(error);
	}
});

router.get('/city/:city', optionalAuth, async (req, res, next) => {
	try {
		const stats = await getCityTerritoryStats(decodeURIComponent(req.params.city));
		res.json(stats);
	} catch (error) {
		next(error);
	}
});

router.get('/invasions', optionalAuth, async (req, res, next) => {
	try {
		const limit = Number(req.query.limit || 20);
		const city = req.query.city || null;
		const invasions = await MapService.getRecentInvasions(limit, city);
		res.json({ invasions });
	} catch (error) {
		next(error);
	}
});

// ═══════════════════════════════════════════════════════════════════════
// NEW: Get path traces for last 24 hours within bounding box
// ═══════════════════════════════════════════════════════════════════════
router.get('/path-traces', optionalAuth, async (req, res, next) => {
	try {
		const { Run, User } = require('../core/schema');
		const GpsPoint = require('mongoose').model('GpsPoint');
		
		const minLat = Number(req.query.minLat);
		const minLng = Number(req.query.minLng);
		const maxLat = Number(req.query.maxLat);
		const maxLng = Number(req.query.maxLng);

		// Validate bounding box
		if (!Number.isFinite(minLat) || !Number.isFinite(minLng) || 
		    !Number.isFinite(maxLat) || !Number.isFinite(maxLng)) {
			return res.status(400).json({ error: 'Invalid bounding box coordinates' });
		}

		// Get recent completed runs; we filter by bbox at GPS point level below
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		
		const runs = await Run.find({
			isActive: false,
			endedAt: { $gte: twentyFourHoursAgo },
		})
		.select('userId username userColor endedAt distanceKm hexesTotal creditsEarned')
		.sort({ endedAt: -1 })
		.lean()
		.limit(120); // Limit to prevent excessive data

		if (!runs || runs.length === 0) {
			return res.json({ traces: [] });
		}

		// Fetch GPS points for these runs
		const runIds = runs.map(r => r._id);
		const gpsPoints = await GpsPoint.find({
			runId: { $in: runIds },
			'location.coordinates.1': { $gte: minLat, $lte: maxLat },
			'location.coordinates.0': { $gte: minLng, $lte: maxLng },
		})
		.select('runId location recordedAt seq')
		.sort({ runId: 1, seq: 1 })
		.lean()
		.limit(10000); // Safety limit

		// Group GPS points by runId
		const pointsByRun = {};
		gpsPoints.forEach(point => {
			const runIdStr = point.runId.toString();
			if (!pointsByRun[runIdStr]) {
				pointsByRun[runIdStr] = [];
			}
			pointsByRun[runIdStr].push({
				lat: point.location.coordinates[1],
				lng: point.location.coordinates[0],
				recordedAt: point.recordedAt,
			});
		});

		// Construct response
		const traces = runs.map(run => ({
			runId: run._id,
			userId: run.userId,
			username: run.username,
			userColor: run.userColor || '#A8D5BA',
			endedAt: run.endedAt,
			distanceKm: run.distanceKm,
			hexesTotal: run.hexesTotal,
			creditsEarned: run.creditsEarned,
			path: pointsByRun[run._id.toString()] || [],
		})).filter(trace => trace.path.length > 0);

		res.json({ traces });
	} catch (error) {
		console.error('[PathTraces] Error:', error);
		next(error);
	}
});

// ═══════════════════════════════════════════════════════════════════════
// FACTION WARS: Get faction dominance per hex at specified resolution
// ═══════════════════════════════════════════════════════════════════════
router.get('/factions', async (req, res, next) => {
	try {
		const { Territory } = require('../core/schema');
		const { cellToParent } = require('h3-js');
		const { getRedis } = require('../config/redis');
		const redis = getRedis();
		
		const resolution = parseInt(req.query.resolution) || 4;
		const now = new Date();
		
		// Try to get from cache first
		const cacheKey = `faction:dominance:${resolution}`;
		try {
			const cached = await redis.get(cacheKey);
			if (cached) {
				return res.json(JSON.parse(cached));
			}
		} catch (e) { /* cache miss */ }
		
		// Get all active hex ownerships
		const ownerships = await Territory.find({})
			.select('hexId faction')
			.lean();
		
		// Map each fine-grained hex to its parent at requested resolution
		const parentCount = {};
		
		ownerships.forEach(({ hexId, faction }) => {
			try {
				const parent = cellToParent(hexId, resolution);
				if (!parentCount[parent]) {
					parentCount[parent] = { red: 0, blue: 0, green: 0 };
				}
				if (faction) {
					parentCount[parent][faction]++;
				}
			} catch (e) {
				// invalid hex, skip
			}
		});
		
		// Determine dominant faction per parent hex
		const result = Object.entries(parentCount).map(([hexId, counts]) => {
			const total = counts.red + counts.blue + counts.green;
			const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
			return {
				hexId,
				faction: dominant ? dominant[0] : null,
				redCount: counts.red,
				blueCount: counts.blue,
				greenCount: counts.green,
				total,
			};
		});
		
		// Global faction totals
		const totals = { red: 0, blue: 0, green: 0 };
		ownerships.forEach(({ faction }) => {
			if (faction && totals[faction] !== undefined) {
				totals[faction]++;
			}
		});
		const totalHexes = ownerships.length;
		
		const response = {
			hexes: result,
			totals,
			percentages: {
				red: totalHexes ? Math.round(totals.red / totalHexes * 100) : 0,
				blue: totalHexes ? Math.round(totals.blue / totalHexes * 100) : 0,
				green: totalHexes ? Math.round(totals.green / totalHexes * 100) : 0,
			},
			totalHexes,
		};
		
		// Cache for 5 minutes
		try {
			await redis.setex(cacheKey, 300, JSON.stringify(response));
		} catch (e) { /* cache write failure */ }
		
		res.json(response);
	} catch (error) {
		console.error('[Factions] Error:', error);
		next(error);
	}
});

module.exports = router;
