// utils/decay.warning.cron.js
// ============================================================
// DECAY WARNING CRON
// Finds territories that have decayed below 50% of original value
// and pushes live alerts to their owners
// Also applies the actual decay values to Territory documents
// ============================================================
const mongoose = require('mongoose');
require('dotenv').config();

const DECAY_RATE_PER_DAY = 0.98;
const WARNING_THRESHOLD  = 0.50; // warn when below 50% value
const BATCH_SIZE         = 500;

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'territory_run' });
  console.log('[DecayCron] Connected');

  const { Territory, CreditLedger, User } = require('../config/models');
  const { pushDecayWarning } = require('../notification-service/push');

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const cursor    = Territory.find({ lastActiveAt: { $lt: oneDayAgo } })
    .select('hexId ownerId creditValue lastActiveAt')
    .cursor();

  let processed = 0, decayed = 0, warned = 0;
  let batch = [];

  for await (const territory of cursor) {
    const msInactive    = Date.now() - new Date(territory.lastActiveAt).getTime();
    const daysInactive  = msInactive / (1000 * 60 * 60 * 24);
    const decayFactor   = Math.pow(DECAY_RATE_PER_DAY, Math.floor(daysInactive));
    const newValue      = Math.max(1, Math.floor(territory.creditValue * decayFactor));
    const originalValue = territory.creditValue;

    processed++;

    if (newValue !== territory.creditValue) {
      batch.push({
        hexId:    territory.hexId,
        ownerId:  territory.ownerId,
        oldValue: territory.creditValue,
        newValue,
        pct:      newValue / 10, // 10 = CREDITS_PER_CLAIMED_HEX (original value)
      });
      decayed++;
    }

    // Send warning if below 50% of original hex value (10 credits)
    if (newValue < 10 * WARNING_THRESHOLD && territory.creditValue >= 10 * WARNING_THRESHOLD) {
      pushDecayWarning(territory.ownerId.toString(), {
        hexId:         territory.hexId,
        currentValue:  newValue,
        originalValue: 10,
      });
      warned++;
    }

    if (batch.length >= BATCH_SIZE) {
      await flushBatch(batch, CreditLedger, User, Territory);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await flushBatch(batch, CreditLedger, User, Territory);
  }

  console.log(`[DecayCron] Done — processed: ${processed}, decayed: ${decayed}, warnings sent: ${warned}`);
  await mongoose.disconnect();
}

async function flushBatch(batch, CreditLedger, User, Territory) {
  await Territory.bulkWrite(batch.map(item => ({
    updateOne: {
      filter: { hexId: item.hexId },
      update: { $set: { creditValue: item.newValue } },
    },
  })));

  // Aggregate credit deltas by user
  const byUser = new Map();
  for (const item of batch) {
    const uid = item.ownerId.toString();
    if (!byUser.has(uid)) byUser.set(uid, 0);
    byUser.set(uid, byUser.get(uid) - (item.oldValue - item.newValue));
  }

  for (const [userId, delta] of byUser.entries()) {
    if (delta === 0) continue;
    const user = await User.findById(userId).select('credits');
    if (!user) continue;
    const newBalance = Math.max(0, user.credits + delta);
    await User.updateOne({ _id: userId }, { $set: { credits: newBalance } });
    await CreditLedger.create({
      userId,
      delta,
      reason:       'decay',
      balanceAfter: newBalance,
      ts:           new Date(),
    });
  }
}

run().catch(err => {
  console.error('[DecayCron] Fatal:', err);
  process.exit(1);
});
