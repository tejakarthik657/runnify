const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const LeaderboardService = require('./leaderboard.logic');

const router = express.Router();

router.get('/global', optionalAuth, async (req, res, next) => {
	try {
		const entries = await LeaderboardService.get('global');
		res.json({ scope: 'global', entries });
	} catch (error) {
		next(error);
	}
});

router.get('/city/:city', optionalAuth, async (req, res, next) => {
	try {
		const entries = await LeaderboardService.get('city', req.params.city);
		res.json({ scope: 'city', city: req.params.city, entries });
	} catch (error) {
		next(error);
	}
});

module.exports = router;
