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

module.exports = router;
