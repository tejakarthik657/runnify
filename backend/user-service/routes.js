const express = require('express');
const multer = require('multer');
const { authenticateJWT } = require('../middleware/auth');
const { getProfile, searchUsers } = require('./profile.controller');
const { User, UserAchievement, AchievementDef } = require('../core/schema');

const router = express.Router();

// Configure multer for image uploads (memory storage for direct R2 upload)
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
	fileFilter: (req, file, cb) => {
		const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
		if (allowedMimes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error(`Invalid file type: ${file.mimetype}`), false);
		}
	}
});

// Get all online users (from Socket.IO tracking)
router.get('/online', authenticateJWT, async (req, res, next) => {
	try {
		const { redis } = require('../config/redis');
		const onlineRaw = await redis.smembers('online_users');
		console.log(`[Presence] Raw entries in Redis:`, onlineRaw);

		const onlineUsers = [];
		const seenUserIds = new Set();

		onlineRaw.forEach(record => {
			try {
				const parsed = JSON.parse(record);
				if (parsed && !seenUserIds.has(parsed.userId)) {
					seenUserIds.add(parsed.userId);
					onlineUsers.push(parsed);
				}
			} catch {
				// ignore invalid records
			}
		});
		console.log(`[Presence] Parsed unique users:`, onlineUsers.length);

		const userIds = onlineUsers.map(u => u.userId);
		const users = await User.find({ _id: { $in: userIds } })
			.select('_id username color credits globalRank')
			.lean();
		console.log(`[Presence] Found ${users.length} users in DB for ${userIds.length} IDs`);

		const userMap = new Map(users.map(u => [u._id.toString(), u]));

		const enriched = onlineUsers.map(online => ({
			...online,
			credits: userMap.get(online.userId)?.credits || 0,
			globalRank: userMap.get(online.userId)?.globalRank || null
		}));

		res.json({ onlineUsers: enriched, count: enriched.length });
	} catch (error) {
		console.error('[Presence Error]', error);
		next(error);
	}
});

// Private routes first
router.post('/me/color', authenticateJWT, require('./profile.controller').setColor);
router.post('/me/settings', authenticateJWT, require('./profile.controller').updateSettings);
router.post('/me/profile-image', authenticateJWT, upload.single('file'), require('./profile.controller').uploadProfileImage);
router.get('/me/sessions', authenticateJWT, require('./profile.controller').getSessions);
router.delete('/me/sessions/:sessionId', authenticateJWT, require('./profile.controller').revokeSession);
router.post('/me/sessions/logout-all', authenticateJWT, require('./profile.controller').revokeAllSessions);

// Moments (ephemeral posts)
const momentCtrl = require('./moment.controller');
router.post('/me/moments', authenticateJWT, upload.single('file'), momentCtrl.createMoment);
router.get('/moments', authenticateJWT, momentCtrl.getMoments);

router.get('/search', authenticateJWT, searchUsers);
router.get('/:id', authenticateJWT, getProfile);

// Private — list all achievements + earned status for the caller
router.get('/me/achievements', authenticateJWT, async (req, res, next) => {
	try {
		// Get all achievement definitions
		const allDefs = await AchievementDef.find({}).lean();

		// Get achievements earned by the current user
		const earned = await UserAchievement.find({ userId: req.userId })
			.select('achievementSlug earnedAt').lean();
		const earnedMap = new Map(earned.map(e => [e.achievementSlug, e.earnedAt]));

		// Combine definitions with earned status
		const achievements = allDefs.map(def => ({
			key: def.slug || def.key,
			name: def.name,
			description: def.description,
			icon: def.icon,
			earned: earnedMap.has(def.slug || def.key),
			earnedAt: earnedMap.get(def.slug || def.key) || null,
		}));

		res.json({
			total: achievements.length,
			earned: earned.length,
			achievements,
		});
	} catch (err) {
		next(err);
	}
});

// Set faction for Global Territory Wars (one-time choice)
router.patch('/me/faction', authenticateJWT, async (req, res, next) => {
	try {
		const { faction } = req.body;
		
		// Validate faction exists and is valid
		if (!faction) {
			return res.status(400).json({ error: 'Faction required. Provide one of: red, blue, green.' });
		}
		
		if (!['red', 'blue', 'green'].includes(faction.toString().toLowerCase())) {
			return res.status(400).json({ error: 'Invalid faction. Must be red, blue, or green.' });
		}
		
		const userId = req.userId || req.user?.userId || req.user?.sub;
		const user = await User.findById(userId);
		
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}
		
		// Check if user already has a faction
		if (user.faction) {
			return res.status(400).json({ error: 'Faction already chosen. Cannot change once set.' });
		}
		
		// Set faction
		const updated = await User.findByIdAndUpdate(
			userId,
			{
				$set: {
					faction: faction.toString().toLowerCase(),
					factionJoinedAt: new Date(),
				}
			},
			{ new: true }
		).select('faction factionJoinedAt username');
		
		res.json({ faction: updated.faction, factionJoinedAt: updated.factionJoinedAt, username: updated.username });
	} catch (err) {
		console.error('[Faction] PATCH /me/faction error:', err.message);
		next(err);
	}
});

module.exports = router;
