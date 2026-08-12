// chat-service/socket.js
// ============================================================
// CHAT SERVICE — Global / City / DM Rooms via Socket.IO
// ============================================================
const jwt = require('jsonwebtoken');
const { ChatMessage, ChatRoom, User } = require('../config/models');
const { getRedis } = require('../config/redis');

const CHAT_RATE_LIMIT = 60;    // messages per hour per user
const MAX_MESSAGE_LENGTH = 500;
const HISTORY_LIMIT = 50;    // messages loaded on room join

// ─────────────────────────────────────────────────────────────
// Verify JWT from socket handshake
// ─────────────────────────────────────────────────────────────
function authenticateChatSocket(socket) {
  const token = socket.handshake.auth?.token;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Rate limiter — Redis sliding window (60 msgs/hr per user)
// ─────────────────────────────────────────────────────────────
async function checkChatRateLimit(userId) {
  const redis = getRedis();
  const now = Date.now();
  const key = `chat:rate:${userId}`;
  const windowMs = 60 * 60 * 1000; // 1 hour window

  // Add current timestamp to sorted set, score = timestamp
  await redis.zadd(key, { score: now, member: `${now}` });
  // Remove entries older than 1 hour
  await redis.zremrangebyscore(key, 0, now - windowMs);
  // Count remaining entries
  const count = await redis.zcard(key);
  await redis.expire(key, 3600);

  return count <= CHAT_RATE_LIMIT;
}

// ─────────────────────────────────────────────────────────────
// Sanitize message content — strip HTML, trim
// ─────────────────────────────────────────────────────────────
function sanitizeContent(content) {
  if (typeof content !== 'string') return '';
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

// ─────────────────────────────────────────────────────────────
// Get or create a room document
// ─────────────────────────────────────────────────────────────
async function ensureRoom(roomId, members = []) {
  let type = 'global';
  let city = null;
  let name = 'Global';

  if (roomId.startsWith('dm:')) {
    type = 'dm';
    name = 'Direct Message';
  } else if (roomId.startsWith('city:')) {
    type = 'city';
    // Trim whitespace to avoid duplicate key errors from "Hyderabad " vs "Hyderabad"
    city = roomId.split(':')[1]?.trim();
    name = city;
  }

  try {
    await ChatRoom.updateOne(
      { roomId },
      {
        $setOnInsert: { roomId, members, name, city, type },
      },
      { upsert: true }
    );
  } catch (err) {
    // E11000 = duplicate key — room already exists, safe to ignore
    if (err.code === 11000) {
      return;
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// Build DM room ID from two user IDs (canonical, sorted)
// ─────────────────────────────────────────────────────────────
function dmRoomId(userId1, userId2) {
  return `dm:${[userId1, userId2].map(String).sort().join('-')}`;
}

// ─────────────────────────────────────────────────────────────
// Load message history for a room (last N messages)
// ─────────────────────────────────────────────────────────────
async function loadHistory(roomId, limit = HISTORY_LIMIT) {
  return ChatMessage.find({ roomId })
    .sort({ ts: -1 })
    .limit(limit)
    .select('senderId senderUsername senderColor content ts')
    .lean()
    .then(msgs => msgs.reverse()); // oldest first
}

// ─────────────────────────────────────────────────────────────
// MAIN: Register chat namespace on Socket.IO
// ─────────────────────────────────────────────────────────────
function initChatHandlers(io) {
  // Separate /chat namespace keeps GPS and chat traffic separate
  const chat = io.of('/chat');

  // ── Auth middleware ────────────────────────────────────────
  chat.use((socket, next) => {
    const user = authenticateChatSocket(socket);
    if (!user) return next(new Error('Unauthorized'));
    socket.user = user;
    next();
  });

  // ── Connection ─────────────────────────────────────────────
  chat.on('connection', async (socket) => {
    const userId = socket.user.userId || socket.user.sub;
    const username = socket.user.username;
    const color = socket.user.color;
    const avatarUrl = socket.user.avatarUrl;

    // Join personal room for notifications
    socket.join(`user:${userId}`);
    console.log(`[Chat] ${username} connected (${socket.id})`);

    // --- Track user as online ---
    const { getRedis } = require('../config/redis');
    const redis = getRedis();
    const userRecord = JSON.stringify({ userId, username, userColor: color, avatarUrl, socketId: socket.id, namespace: 'chat' });
    const result = await redis.sadd('online_users', userRecord);
    console.log(`[Presence] Added ${username} to online_users. Status: ${result}. Record: ${userRecord}`);

    // Pulse lastActiveAt
    await User.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date() } });

    // ── Join room event ───────────────────────────────────────
    socket.on('join-room', async (data) => {
      // Handle both raw string and { roomId } object
      const roomId = typeof data === 'string' ? data : data?.roomId;
      if (!roomId) return;

      // Validate room access (can't join someone else's private DM)
      if (roomId.startsWith('dm:')) {
        const valid = roomId.includes(userId.toString());
        if (!valid) return socket.emit('error', 'Not authorized for this DM');
      }

      await ensureRoom(roomId);
      socket.join(roomId);

      // Send history
      const history = await loadHistory(roomId);
      socket.emit('history', { roomId, messages: history });

      // Notify others
      socket.to(roomId).emit('user-joined', { username, color });
    });

    // ── Send message ───────────────────────────────────────────
    socket.on('send-message', async (data) => {
      const { roomId, content } = data;
      if (!roomId || !content) return;

      // Rate limit check
      const allowed = await checkChatRateLimit(userId);
      if (!allowed) {
        return socket.emit('error', 'Rate limit exceeded (60 messages/hour)');
      }

      // Sanitize
      const sanitized = sanitizeContent(content);
      if (!sanitized) return;

      // Detect room type for storage
      let roomType = 'global';
      if (roomId.startsWith('dm:')) roomType = 'dm';
      else if (roomId.startsWith('city:')) roomType = 'city';

      // Save to DB
      const message = await ChatMessage.create({
        roomId,
        roomType,
        senderId: userId,
        senderUsername: username,
        senderColor: color,
        content: sanitized,
        sentAt: new Date(),
      });

      // Broadcast - Aligned with frontend Expectation (MessageBubble.tsx)
      chat.to(roomId).emit('message', {
        _id: message._id,
        roomId: roomId,
        sender: {
          _id: userId,
          username: username,
          color: color,
          avatarUrl: avatarUrl
        },
        content: sanitized,
        createdAt: message.sentAt, // Map sentAt to createdAt for frontend
      });
    });

    // ── Typing indicator ───────────────────────────────────────
    socket.on('typing', (data) => {
      const roomId = typeof data === 'string' ? data : data?.roomId;
      if (roomId) socket.to(roomId).emit('user-typing', { username });
    });

    // ── Leave room ─────────────────────────────────────────────
    socket.on('leave-room', (data) => {
      const roomId = typeof data === 'string' ? data : data?.roomId;
      if (roomId) {
        socket.leave(roomId);
        socket.to(roomId).emit('user-left', { username });
      }
    });

    // ── Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`[Chat] ${username} disconnected`);
      const { getRedis } = require('../config/redis');
      const redis = getRedis();
      const record = JSON.stringify({ userId, username, userColor: color, socketId: socket.id, namespace: 'chat' });
      await redis.srem('online_users', record);
    });
  });
}

module.exports = {
  initChatHandlers,
  dmRoomId,
  loadHistory,
  ensureRoom,
  authenticateChatSocket,
  checkChatRateLimit,
  sanitizeContent,
};
