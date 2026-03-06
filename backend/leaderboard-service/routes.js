const express = require('express');
const { optionalAuth, authenticateJWT } = require('../middleware/auth');
const { User } = require('../core/schema');
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

router.get('/24hour', optionalAuth, async (req, res, next) => {
	try {
		const entries = await LeaderboardService.build24HourGlobal();
		res.json({ scope: '24hour', period: 'daily', resetIn: 'check-nextReset', entries });
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

router.get('/24hour/city/:city', optionalAuth, async (req, res, next) => {
	try {
		const entries = await LeaderboardService.build24HourCity(req.params.city);
		res.json({ scope: '24hour', city: req.params.city, period: 'daily', entries });
	} catch (error) {
		next(error);
	}
});

router.get('/stats', async (req, res, next) => {
	try {
		const stats = await LeaderboardService.getGlobalStats();
		res.json(stats);
	} catch (error) {
		next(error);
	}
});

// Enhanced stats for landing page with real-time metrics
router.get('/enhanced-stats', async (req, res, next) => {
	try {
		const stats = await LeaderboardService.getEnhancedStats();
		res.json(stats);
	} catch (error) {
		next(error);
	}
});

// Top commanders for landing page podium
router.get('/top-commanders', async (req, res, next) => {
	try {
		const limit = parseInt(req.query.limit) || 3;
		const commanders = await LeaderboardService.getTopCommanders(limit);
		res.json({ commanders });
	} catch (error) {
		next(error);
	}
});

// City activity rankings for landing page heatmap
router.get('/city-activity', async (req, res, next) => {
	try {
		const cities = await LeaderboardService.getCityActivity();
		res.json({ cities });
	} catch (error) {
		next(error);
	}
});

// Recent wins feed (achievements + high-performing runs)
router.get('/recent-wins', async (req, res, next) => {
	try {
		const limit = parseInt(req.query.limit) || 5;
		const wins = await LeaderboardService.getRecentWins(limit);
		res.json({ wins });
	} catch (error) {
		next(error);
	}
});

router.get('/me', authenticateJWT, async (req, res, next) => {
	try {
		const userId = req.userId || req.user?.userId || req.user?.sub;
		const user = await User.findById(userId).select('credits username color').lean();
		if (!user) return res.status(404).json({ error: 'User not found' });

		const usersAbove = await User.countDocuments({ credits: { $gt: user.credits }, isBanned: false });
		const payload = {
			rank: usersAbove + 1,
			username: user.username,
			color: user.color,
			credits: user.credits,
		};
		res.json({ ...payload, userRank: payload });
	} catch (error) {
		next(error);
	}
});

// Faction leaderboard — cities ranked by faction control
router.get('/factions', async (req, res, next) => {
	try {
		const { Territory } = require('../core/schema');
		const now = new Date();
		
		const pipeline = [
			{ $match: { } },
			{ $group: {
				_id: { city: '$city', faction: '$faction' },
				count: { $sum: 1 },
			}},
			{ $sort: { count: -1 } },
		];
		
		const results = await Territory.aggregate(pipeline);
		
		// Group by city
		const cities = {};
		results.forEach(({ _id, count }) => {
			if (!_id.city) return; // skip hexes without city
			if (!cities[_id.city]) {
				cities[_id.city] = {
					city: _id.city,
					red: 0,
					blue: 0,
					green: 0,
					total: 0,
					dominant: null
				};
			}
			if (_id.faction) {
				cities[_id.city][_id.faction] = count;
				cities[_id.city].total += count;
			}
		});
		
		// Determine dominant faction per city
		Object.values(cities).forEach(city => {
			const factions = [
				{ faction: 'red', count: city.red },
				{ faction: 'blue', count: city.blue },
				{ faction: 'green', count: city.green },
			].sort((a, b) => b.count - a.count);
			
			if (factions[0].count > 0) {
				city.dominant = factions[0].faction;
			}
		});
		
		// Convert to array and sort by total
		const cityArray = Object.values(cities).sort((a, b) => b.total - a.total);
		
		res.json({ cities: cityArray });
	} catch (error) {
		next(error);
	}
});

module.exports = router;
