const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { MapService } = require('../core/services');

const router = express.Router();

router.get('/territories', optionalAuth, async (req, res, next) => {
	try {
		const minLat = Number(req.query.minLat);
		const minLng = Number(req.query.minLng);
		const maxLat = Number(req.query.maxLat);
		const maxLng = Number(req.query.maxLng);
		const territories = await MapService.getTerritoriesInBbox({ minLat, minLng, maxLat, maxLng });
		res.json({ territories });
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
