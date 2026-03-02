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

// ── POST /chat/dm/start ───────────────────────────────────────
// Initiate a DM with another user — returns the room ID
router.post('/dm/start', requireAuth, async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });
    if (targetUserId === req.userId) return res.status(400).json({ error: 'Cannot DM yourself' });

    const targetUser = await User.findById(targetUserId).select('username').lean();
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
      targetUser: { id: targetUserId, username: targetUser.username },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
