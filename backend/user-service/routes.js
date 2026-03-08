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

// Set/Update faction for Global Territory Wars (can be changed anytime)
router.patch('/me/faction', authenticateJWT, async (req, res, next) => {
	try {
		const { faction } = req.body;
		
		// Validate faction exists and is valid
		if (!faction) {
			return res.status(400).json({ 
				error: 'Faction required. Provide one of: red, blue, green.',
				validFactions: ['red', 'blue', 'green']
			});
		}
		
		const factionLower = faction.toString().toLowerCase();
		if (!['red', 'blue', 'green'].includes(factionLower)) {
			return res.status(400).json({ 
				error: `Invalid faction: "${faction}". Must be red, blue, or green.`,
				provided: faction,
				validFactions: ['red', 'blue', 'green']
			});
		}
		
		const userId = req.userId || req.user?.userId || req.user?.sub;
		const user = await User.findById(userId).select('faction factionJoinedAt username color credits hexesOwned globalRank');
		
		if (!user) {
			return res.status(404).json({ error: 'User not found', userId });
		}
		
		// Track if this is a change (not initial selection)
		const isChange = user.faction && user.faction !== factionLower;
		const previousFaction = user.faction;
		
		console.log(`[Faction] ${isChange ? 'Changing' : 'Setting'} faction ${previousFaction ? `from ${previousFaction} ` : ''}to ${factionLower} for user ${userId}`);
		
		// Update faction (allow changes anytime - unlimited)
		const updated = await User.findByIdAndUpdate(
			userId,
			{
				$set: {
					faction: factionLower,
					factionJoinedAt: new Date(),
				}
			},
			{ new: true }
		).select('faction factionJoinedAt username color credits hexesOwned globalRank');
		
		console.log(`[Faction] Successfully updated faction: ${JSON.stringify(updated)}`);
		
		// Emit socket event to notify ALL clients of faction change
		try {
			const { getIO } = require('../run-service/socket.handlers');
			const io = getIO();
			if (io) {
				// Broadcast to all users (including map viewers)
				io.emit('faction_updated', {
					userId: userId.toString(),
					username: updated.username,
					faction: updated.faction,
					previousFaction: previousFaction || null,
					factionJoinedAt: updated.factionJoinedAt,
					isChange: isChange,
					color: updated.color,
					credits: updated.credits,
					globalRank: updated.globalRank
				});
				console.log(`[Faction] Emitted faction_updated event for user ${userId} (${isChange ? 'change' : 'initial'})`);  
			}
		} catch (ioErr) {
			// Socket emission is non-critical, log warning but don't fail request
			console.warn('[Faction] Failed to emit faction_updated event:', ioErr.message);
		}
		
		res.json({ 
			success: true,
			faction: updated.faction, 
			factionJoinedAt: updated.factionJoinedAt, 
			username: updated.username,
			isChange: isChange,
			previousFaction: previousFaction || null,
			message: isChange ? `Faction changed from ${previousFaction} to ${factionLower}` : `Joined ${factionLower} faction`
		});
	} catch (err) {
		console.error('[Faction] PATCH /me/faction error:', err.message, err.stack);
		next(err);
	}
});

module.exports = router;
