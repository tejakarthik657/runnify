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

		// Get runs from last 24 hours that overlap with bounding box
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		
		const runs = await Run.find({
			isActive: false,
			endedAt: { $gte: twentyFourHoursAgo },
			'boundingBox.minLat': { $lte: maxLat },
			'boundingBox.maxLat': { $gte: minLat },
			'boundingBox.minLng': { $lte: maxLng },
			'boundingBox.maxLng': { $gte: minLng },
		})
		.select('userId username userColor endedAt distanceKm hexesTotal creditsEarned')
		.lean()
		.limit(100); // Limit to prevent excessive data

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

module.exports = router;
