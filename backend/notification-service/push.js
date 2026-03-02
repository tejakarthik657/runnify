// notification-service/push.js
// ============================================================
// LIVE NOTIFICATION DELIVERY VIA SOCKET.IO
// ============================================================
// This module is imported by gps.processor and leaderboard
// to push real-time alerts to connected users.

let _io = null;

/**
 * Register the Socket.IO instance (called once from api-gateway)
 */
function registerIO(io) {
  _io = io;
}

/**
 * Push a notification to a specific user
 * User must be in their personal room: user:<userId>
 *
 * @param {string} userId
 * @param {string} type     — 'invasion' | 'rank_change' | 'achievement' | 'decay_warning'
 * @param {object} payload  — type-specific data
 */
function pushToUser(userId, type, payload) {
  if (!_io) {
    console.warn('[NotifyPush] Socket.IO not registered yet');
    return;
  }
  _io.to(`user:${userId}`).emit('notification', {
    type,
    payload,
    ts: Date.now(),
  });
}

/**
 * Push invasion alert to defender (Loss-Framed)
 */
function pushInvasionAlert(defenderId, { hexId, attackerUsername, attackerColor, creditsLost }) {
  pushToUser(defenderId, 'invasion_alert', {
    message: `SEIZED: ${attackerUsername} has captured your territory!`,
    hexId,
    attackerUsername,
    attackerColor,
    creditsLost,
    severity: 'critical'
  });
}

/**
 * Push rank change notification (Loss-Framed for drops)
 */
function pushRankChange(userId, { oldRank, newRank }) {
  const direction = newRank < oldRank ? 'up' : 'down';
  pushToUser(userId, direction === 'up' ? 'rank_up' : 'rank_drop', {
    message: direction === 'up'
      ? `PROMOTED: You are now rank #${newRank}! 🎉`
      : `DEMOTED: You dropped to rank #${newRank}. Reclaim your standing!`,
    oldRank,
    newRank,
    direction,
  });
}

/**
 * Push new rivalry notification
 */
function pushNewRival(userId, { rivalUsername }) {
  pushToUser(userId, 'new_rival', {
    message: `NEW RIVAL: ${rivalUsername} is now a designated target!`,
    rivalUsername,
  });
}

/**
 * Push achievement unlock notification
 */
function pushAchievement(userId, { key, name, description, icon }) {
  pushToUser(userId, 'achievement', {
    message: `Achievement unlocked: ${name} ${icon}`,
    key,
    name,
    description,
    icon,
  });
}

/**
 * Push decay warning when territory is aging
 * (Triggered by decay cron when a hex falls below 50% value)
 */
function pushDecayWarning(userId, { hexId, currentValue, originalValue }) {
  pushToUser(userId, 'decay_warning', {
    message: `Your territory is decaying! Run to refresh it.`,
    hexId,
    currentValue,
    originalValue,
    pctRemaining: Math.round((currentValue / originalValue) * 100),
  });
}

module.exports = {
  registerIO,
  pushToUser,
  pushInvasionAlert,
  pushRankChange,
  pushAchievement,
  pushDecayWarning,
  pushNewRival,
};
