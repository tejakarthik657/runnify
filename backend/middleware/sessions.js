const { Session } = require('../core/schema');
const crypto = require('crypto');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─────────────────────────────────────────────────────────────
// Store a new refresh token in sessions_v1
// Called when issuing a new refresh token (login / register / refresh)
// ─────────────────────────────────────────────────────────────
async function storeRefreshToken(userId, refreshToken, req) {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await Session.create({
    userId,
    refreshToken, // Central schema has this
    tokenHash,
    userAgent: req?.headers?.['user-agent'] || null,
    ipAddress: req?.ip || null,
    expiresAt,
  });
}

// ─────────────────────────────────────────────────────────────
// Validate a refresh token — checks it's not revoked
// ─────────────────────────────────────────────────────────────
async function validateRefreshToken(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  const session = await Session.findOne({ tokenHash });

  if (!session) return { valid: false, reason: 'Session not found' };
  if (session.isRevoked) return { valid: false, reason: 'Session has been revoked' };
  if (session.expiresAt < new Date()) return { valid: false, reason: 'Session expired' };

  return { valid: true, userId: session.userId, session };
}

// ─────────────────────────────────────────────────────────────
// Revoke a specific refresh token (logout from one device)
// ─────────────────────────────────────────────────────────────
async function revokeRefreshToken(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await Session.updateOne({ tokenHash }, { $set: { isRevoked: true } });
}

// ─────────────────────────────────────────────────────────────
// Revoke ALL sessions for a user (logout from all devices)
// ─────────────────────────────────────────────────────────────
async function revokeAllSessions(userId) {
  await Session.updateMany(
    { userId, isRevoked: false },
    { $set: { isRevoked: true } }
  );
}

// ─────────────────────────────────────────────────────────────
// GET active sessions for a user (for "Devices" settings page)
// ─────────────────────────────────────────────────────────────
async function getUserSessions(userId) {
  return Session.find({
    userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  })
    .select('_id userAgent ipAddress createdAt expiresAt')
    .lean();
}

module.exports = {
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllSessions,
  getUserSessions,
  Session,
};
