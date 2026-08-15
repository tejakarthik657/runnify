// user-service/profile.controller.js
// ============================================================
// USER PROFILE — Stats, Territory Heatmap, Settings, Color
// ============================================================
const { User, Territory, Run, Invasion, CreditLedger, UserAchievement, AchievementDef } = require('../config/models');
const { applyDecay } = require('../run-service/credit.engine');
const { hexCenter } = require('../run-service/h3.service');

const ALLOWED_COLORS = [
  '#00FF88', '#0080FF', '#FF2244', '#FFB300',
  '#FF00AA', '#00DDFF', '#FF5500',
];
const PRESTIGE_COLOR = '#FFFFFF'; // unlocked only at city rank #1

// ─────────────────────────────────────────────────────────────
// GET /user/search?q=term — username/hashcode search
// ─────────────────────────────────────────────────────────────
async function searchUsers(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });

    let query;
    if (q.startsWith('#')) {
      // Color search
      query = { color: q.toUpperCase(), isBanned: false };
    } else {
      // Username/hashcode search
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query = {
        isBanned: false,
        $or: [
          { username: regex },
          { hashcode: regex },
        ],
      };
    }

    const { redis } = require('../config/redis');
    const [users, onlineRaw] = await Promise.all([
      User.find(query)
        .select('_id username color hashcode city credits totalHexes homeLocation')
        .limit(20)
        .lean(),
      redis.smembers('online_users'),
    ]);

    // Parse online users and fetch live positions
    const onlineUserIds = new Set();
    onlineRaw.forEach(record => {
      try {
        const parsed = JSON.parse(record);
        if (parsed?.userId) onlineUserIds.add(parsed.userId.toString());
      } catch (e) { }
    });

    // Fetch live positions and running flags for all found users
    const liveFetchPromises = users.map(async (user) => {
      const uid = user._id.toString();
      const [livePos, isRunning] = await Promise.all([
        redis.get(`user:live:pos:${uid}`),
        redis.get(`user:running:${uid}`)
      ]);
      return {
        id: uid,
        livePos: livePos ? JSON.parse(livePos) : null,
        isRunning: !!isRunning
      };
    });
    const liveDataResults = await Promise.all(liveFetchPromises);
    const liveDataMap = new Map(liveDataResults.map(ld => [ld.id, ld]));

    const enrichedUsers = users.map(user => {
      const liveInfo = liveDataMap.get(user._id.toString());
      const isRunning = liveInfo?.isRunning || onlineUserIds.has(user._id.toString());

      // Prioritize LIVE position if they are running, otherwise use Home Location
      const lat = liveInfo?.livePos?.lat ?? user.homeLocation?.lat ?? null;
      const lng = liveInfo?.livePos?.lng ?? user.homeLocation?.lng ?? null;

      return {
        id: user._id,
        username: user.username,
        color: user.color,
        hashcode: user.hashcode,
        city: user.city,
        credits: user.credits,
        totalHexes: user.totalHexes,
        isRunningNow: isRunning,
        lastPosition: lat !== null ? { lat, lng } : null
      };
    });

    return res.json({ count: enrichedUsers.length, users: enrichedUsers });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /user/:id/profile
// Public profile — respects privacy settings
// ─────────────────────────────────────────────────────────────
async function getProfile(req, res, next) {
  try {
    const { id } = req.params;
    const requesterId = req.userId; // may be undefined (public route)

    const user = await User.findById(id)
      .select('-passwordHash -email -schemaVersion')
      .lean();

    if (!user) return res.status(404).json({ error: 'User not found' });

    // ── Privacy: hideStatsFromPublic hides stats from non-self viewers ─
    const isSelf = requesterId && requesterId.toString() === id.toString();
    if (user.privacy?.hideStatsFromPublic && !isSelf) {
      return res.json({
        id: user._id,
        username: user.username,
        color: user.color,
        hashcode: user.hashcode,
        private: true,
      });
    }

    // ── Territory heatmap data ──────────────────────────────
    const territories = await Territory.find({ ownerId: id })
      .select('hexId creditValue lastActiveAt invasionCount claimedAt')
      .lean();

    const heatmapHexes = territories.map(t => ({
      hexId: t.hexId,
      creditValue: applyDecay(t.creditValue, t.lastActiveAt),
      invasionCount: t.invasionCount,
      claimedAt: t.claimedAt,
      center: hexCenter(t.hexId),
    }));

    // ── Compute total portfolio credit value ────────────────
    const totalPortfolioValue = heatmapHexes.reduce((sum, h) => sum + h.creditValue, 0);

    // ── Recent runs summary ─────────────────────────────────
    const recentRuns = await Run.find({ userId: id, status: 'ended' })
      .sort({ endedAt: -1 })
      .limit(10)
      .select('startedAt endedAt hexesClaimed hexesInvaded creditsEarned kmDistance')
      .lean();

    // ── Invasion stats: how many times defended vs attacked ──
    const [attacksMade, attacksReceived] = await Promise.all([
      Invasion.countDocuments({ attackerId: id }),
      Invasion.countDocuments({ defenderId: id }),
    ]);

    // ── Achievements ─────────────────────────────────────────
    const earnedAchievements = await UserAchievement.find({ userId: id })
      .populate('achievementKey')
      .lean();

    // ── All-time run stats ───────────────────────────────────
    const runStats = await Run.aggregate([
      { $match: { userId: user._id, status: 'ended' } },
      {
        $group: {
          _id: null,
          totalRuns: { $sum: 1 },
          totalKm: { $sum: '$kmDistance' },
          totalClaimed: { $sum: { $size: '$hexesClaimed' } },
          totalInvaded: { $sum: { $size: '$hexesInvaded' } },
          totalCredits: { $sum: '$creditsEarned' },
          avgKmPerRun: { $avg: '$kmDistance' },
          bestRun: { $max: '$creditsEarned' },
        }
      },
    ]);

    const stats = runStats[0] || {
      totalRuns: 0, totalKm: 0, totalClaimed: 0,
      totalInvaded: 0, totalCredits: 0, avgKmPerRun: 0, bestRun: 0,
    };

    res.json({
      id: user._id,
      username: user.username,
      color: user.color,
      hashcode: user.hashcode,
      avatarUrl: user.avatarUrl,
      city: user.city,
      rank: user.rank,
      credits: user.credits,
      totalHexes: user.totalHexes,
      totalKm: user.totalKm,
      terrirortyCount: territories.length,
      heatmapHexes,
      totalPortfolioValue,
      recentRuns,
      invasions: { made: attacksMade, received: attacksReceived },
      achievements: earnedAchievements,
      stats,
      createdAt: user.createdAt,
      privacy: isSelf ? user.privacy : undefined,
      unfoggedHexes: isSelf ? (user.unfoggedHexes || []) : undefined,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /user/me/color — change profile color
// ─────────────────────────────────────────────────────────────
async function setColor(req, res, next) {
  try {
    const { color } = req.body;
    if (!color) return res.status(400).json({ error: 'color required' });
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexRegex.test(color)) {
      return res.status(400).json({ error: 'Invalid hex color format. Use #RRGGBB.' });
    }

    // Check prestige eligibility
    if (color === PRESTIGE_COLOR) {
      const user = await User.findById(req.userId).select('rank city');
      if (!user) throw new Error('User not found');

      // Must be rank #1 in their city
      const topInCity = await User.findOne({ city: user.city, 'privacy.hideStatsFromPublic': false })
        .sort({ credits: -1 })
        .select('_id')
        .lean();

      if (!topInCity || topInCity._id.toString() !== user._id.toString()) {
        return res.status(403).json({ error: 'Must be rank #1 in your city for prestige color.' });
      }
    }

    await User.updateOne({ _id: req.userId }, { $set: { color } });
    res.json({ color, message: 'Color updated' });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /user/me/settings — update privacy + notification settings
// ─────────────────────────────────────────────────────────────
async function updateSettings(req, res, next) {
  try {
    const { hideStatsFromPublic, allowDirectMessages } = req.body;
    const updates = {};

    if (hideStatsFromPublic !== undefined) updates['privacy.hideStatsFromPublic'] = hideStatsFromPublic;
    if (allowDirectMessages !== undefined) updates['privacy.allowDirectMessages'] = allowDirectMessages;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await User.updateOne({ _id: req.userId }, { $set: updates });
    res.json({ message: 'Settings updated', updates });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /user/me/sessions — list active sessions (multi-device)
// ─────────────────────────────────────────────────────────────
async function getSessions(req, res, next) {
  try {
    const { getUserSessions } = require('../middleware/sessions');
    const sessions = await getUserSessions(req.userId);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /user/me/sessions/:sessionId — logout from one device
// ─────────────────────────────────────────────────────────────
async function revokeSession(req, res, next) {
  try {
    const { Session } = require('../middleware/sessions');
    const session = await Session.findOneAndUpdate(
      { _id: req.params.sessionId, userId: req.userId },
      { $set: { isRevoked: true } },
      { new: true }
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ message: 'REMOTE_SESSION_TERMINATED' });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /user/me/sessions/logout-all — logout from all devices
// ─────────────────────────────────────────────────────────────
async function revokeAllSessions(req, res, next) {
  try {
    const { revokeAllSessions: revokeAll } = require('../middleware/sessions');
    await revokeAll(req.userId);
    res.json({ message: 'Logged out from all devices' });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /user/me/profile-image — upload profile picture
// ─────────────────────────────────────────────────────────────
async function uploadProfileImage(req, res, next) {
  try {
    const userId = req.userId;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'Image file required' });

    // Upload image to Supabase Storage
    const { uploadToSupabaseStorage } = require('./storage.upload');
    let imageUrl;
    try {
      imageUrl = await uploadToSupabaseStorage(file.buffer, file.mimetype, 'profiles');
    } catch (uploadError) {
      return res.status(500).json({
        error: 'Failed to upload profile image',
        details: uploadError.message
      });
    }

    // Update user avatar URL
    await User.updateOne(
      { _id: userId },
      { $set: { avatarUrl: imageUrl } }
    );

    res.json({
      message: 'Profile image uploaded successfully',
      avatarUrl: imageUrl
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchUsers,
  getProfile,
  setColor,
  updateSettings,
  getSessions,
  revokeSession,
  revokeAllSessions,
  uploadProfileImage,
};
