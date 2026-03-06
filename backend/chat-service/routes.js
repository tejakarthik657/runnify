// chat-service/routes.js
// ============================================================
// CHAT REST ENDPOINTS — History, DM Init, Room List
// ============================================================
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { ChatMessage, ChatRoom, User } = require('../config/models');
const { dmRoomId, loadHistory } = require('./socket');

const router = express.Router();

// ── GET /chat/rooms ───────────────────────────────────────────
// List rooms the user can join: global + their city + active DMs
router.get('/rooms', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('city').lean();

    const rooms = [
      { roomId: 'global', type: 'global', label: '🌍 Global' },
    ];

    if (user?.city) {
      rooms.push({
        roomId: `city:${user.city}`,
        type: 'city',
        label: `🏙️ ${user.city}`,
      });
    }

    // Find existing DM rooms for this user
    const dmRooms = await ChatRoom.find({
      type: 'dm',
      members: req.userId,
    }).lean();

    for (const dm of dmRooms) {
      rooms.push({ roomId: dm.roomId, type: 'dm', label: 'DM' });
    }

    res.json({ rooms });
  } catch (err) {
    next(err);
  }
});

// ── GET /chat/:roomId/history ─────────────────────────────────
// REST fallback for chat history (Socket.IO also sends on join)
router.get('/:roomId/history', requireAuth, async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const before = req.query.before; // cursor-based pagination

    const query = { roomId };
    if (before) query.ts = { $lt: new Date(before) };

    const messages = await ChatMessage.find(query)
      .sort({ sentAt: -1 })
      .limit(limit)
      .select('senderId senderUsername senderColor content sentAt')
      .lean()
      .then(msgs => msgs.reverse().map(m => ({
        _id: m._id,
        content: m.content,
        sentAt: m.sentAt,
        createdAt: m.sentAt, // Alias for frontend
        sender: {
          _id: m.senderId,
          username: m.senderUsername,
          color: m.senderColor
        }
      })));

    res.json({ roomId, messages });
  } catch (err) {
    next(err);
  }
});

// ── GET /chat/online-users ────────────────────────────────────
// Get all currently online users for DM feature (excluding self)
router.get('/online-users', requireAuth, async (req, res, next) => {
  try {
    const { getRedis } = require('../config/redis');
    const redis = getRedis();
    
    // Get all online users from Redis
    const onlineRecords = await redis.smembers('online_users');
    const onlineUsers = [];
    const seenUserIds = new Set();
    
    // Parse and deduplicate by userId (keep latest socket only)
    for (const record of onlineRecords) {
      try {
        const user = JSON.parse(record);
        // Skip self
        if (user.userId === req.userId) continue;
        
        // If we already have this user, skip (we'll take first in set)
        if (seenUserIds.has(user.userId)) continue;
        seenUserIds.add(user.userId);
        
        onlineUsers.push({
          userId: user.userId,
          username: user.username || 'Anonymous',
          color: user.userColor || '#A8D5BA',
          avatarUrl: user.avatarUrl,
          status: 'online'
        });
      } catch (e) {
        // Skip malformed records
        continue;
      }
    }
    
    // Sort by username for consistent UX
    onlineUsers.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
    
    res.json({ onlineUsers, count: onlineUsers.length });
  } catch (err) {
    next(err);
  }
});

// ── POST /chat/dm/start ───────────────────────────────────────
// Initiate a DM with another user — returns the room ID
router.post('/dm/start', requireAuth, async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });
    if (targetUserId === req.userId) return res.status(400).json({ error: 'Cannot DM yourself' });

    const targetUser = await User.findById(targetUserId).select('username color avatarUrl').lean();
    if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

    const roomId = dmRoomId(req.userId, targetUserId);

    // Create room if it doesn't exist, add both members
    await ChatRoom.updateOne(
      { roomId },
      {
        $setOnInsert: { roomId, type: 'dm' },
        $addToSet: { members: { $each: [req.userId, targetUserId] } },
      },
      { upsert: true }
    );

    res.json({
      roomId,
      targetUser: { 
        id: targetUserId, 
        username: targetUser.username,
        color: targetUser.color,
        avatarUrl: targetUser.avatarUrl
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
