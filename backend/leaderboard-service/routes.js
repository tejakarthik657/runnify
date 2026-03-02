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

router.get('/city/:city', optionalAuth, async (req, res, next) => {
	try {
		const entries = await LeaderboardService.get('city', req.params.city);
		res.json({ scope: 'city', city: req.params.city, entries });
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

router.get('/me', authenticateJWT, async (req, res, next) => {
	try {
		const user = await User.findById(req.user.userId).select('credits username color').lean();
		if (!user) return res.status(404).json({ error: 'User not found' });

		const usersAbove = await User.countDocuments({ credits: { $gt: user.credits }, isBanned: false });
		res.json({
			rank: usersAbove + 1,
			username: user.username,
			color: user.color,
			credits: user.credits,
		});
	} catch (error) {
		next(error);
	}
});

module.exports = router;
