/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          NIGHTLY TERRITORY DECAY CRON JOB                            ║
 * ║          Runs every day at midnight UTC                              ║
 * ║          Applies decay formula: credits × (0.98 ^ days_inactive)     ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');
const cron = require('node-cron');
const h3 = require('h3-js');
require('dotenv').config();

const logger = require('./logger');
const { connectDB } = require('../config/db');
const { Territory, CreditLedger, User } = require('../core/schema');
const { applyDecay } = require('../run-service/credit.engine');

const SKIRMISH_DECAY_MULTIPLIER = 4;

// ─────────────────────────────────────────────────────────────
// DECAY CALCULATION
// ─────────────────────────────────────────────────────────────

function buildFactionMap() {
  const map = new Map();
  const all = Territory.find({}).select('hexId faction').lean();
  // Note: find() returns a Query, not an array. We need to await it in runDecaySweep.
  return all;
}

async function isSkirmishHex(hexId, factionMap) {
  if (!hexId) return false;
  const neighbors = h3.gridDisk(hexId, 1);
  const ownFaction = factionMap.get(hexId);
  for (const n of neighbors) {
    const f = factionMap.get(n);
    if (f && ownFaction && f !== ownFaction) return true;
  }
  return false;
}

/**
 * Calculate decay for a single territory
 * Formula: credits × (0.98 ^ days_inactive), minimum 1
 * Skirmish hexes decay at 4x rate
 * 
 * @param {Document} territory — Territory document with credits, lastActiveAt
 * @param {Boolean} isSkirmish — whether this is a contested border hex
 * @returns {Object} { previousCredits, newCredits, decayApplied }
 */
function calculateTerritoryDecay(territory, isSkirmish = false) {
  const previousCredits = territory.credits || 0;
  const decayMultiplier = isSkirmish ? SKIRMISH_DECAY_MULTIPLIER : 1;
  const newCredits = applyDecay(previousCredits, territory.lastActiveAt, decayMultiplier);
  const decayApplied = Math.max(0, previousCredits - newCredits);

  return {
    previousCredits,
    newCredits,
    decayApplied,
    isSkirmish,
    percentageRetained: newCredits > 0 ? Math.round((newCredits / previousCredits) * 100) : 0
  };
}

/**
 * Nightly decay sweep: Updates all territories and creates ledger entries
 * Uses bulk operations for efficiency
 */
async function runDecaySweep() {
  try {
    logger.info('🌙 Starting territory decay sweep...');

    // 1. Fetch all active territories (owned by someone)
    const territories = await Territory.find({
      ownerId: { $exists: true, $ne: null },
      credits: { $gt: 0 }
    }).select('_id ownerId credits lastActiveAt city');

    if (territories.length === 0) {
      logger.info('✅ No territories to decay');
      return;
    }

    logger.info(`📊 Processing ${territories.length} territories for decay...`);

    // Build faction map for skirmish detection
    const factionCursor = Territory.find({}).select('hexId faction').cursor();
    const factionMap = new Map();
    for await (const t of factionCursor) {
      if (t.hexId && t.faction) factionMap.set(t.hexId, t.faction);
    }
    logger.info(`⚔️ Faction map built: ${factionMap.size} territories`);

    // 2. Prepare bulk operations & ledger entries
    const territoryUpdates = [];
    const ledgerEntries = [];
    const userCreditsChange = {};
    let totalDecayApplied = 0;
    let skirmishDecayCount = 0;

    for (const territory of territories) {
      const skirmish = await isSkirmishHex(territory.hexId, factionMap);
      const decay = calculateTerritoryDecay(territory, skirmish);

      if (decay.decayApplied <= 0) continue; // Skip if no decay occurred
      if (skirmish) skirmishDecayCount++;

      // Track territory update
      territoryUpdates.push({
        updateOne: {
          filter: { _id: territory._id },
          update: {
            $set: {
              credits: decay.newCredits,
              decayLastAppliedAt: new Date(),
              creditHistory: {
                previous: decay.previousCredits,
                decayApplied: decay.decayApplied,
                timestamp: new Date()
              }
            }
          }
        }
      });

      // Track ledger entry
      ledgerEntries.push({
        userId: territory.ownerId,
        hexId: territory.hexId,
        type: 'decay', // Special type for automated decay
        creditsDelta: -decay.decayApplied,
        previousBalance: decay.previousCredits,
        newBalance: decay.newCredits,
        reason: skirmish ? 'Nightly territory decay (skirmish border)' : 'Nightly territory decay (inactivity)',
        city: territory.city,
        timestamp: new Date(),
        automated: true,
        metadata: {
          daysInactive: Math.floor((Date.now() - territory.lastActiveAt) / (1000 * 60 * 60 * 24)),
          decayMultiplier: decay.newCredits / decay.previousCredits,
          isSkirmish: skirmish,
          decayMultiplierApplied: skirmish ? SKIRMISH_DECAY_MULTIPLIER : 1,
        }
      });

      // Track user credit changes for aggregate update
      if (!userCreditsChange[territory.ownerId.toString()]) {
        userCreditsChange[territory.ownerId.toString()] = 0;
      }
      userCreditsChange[territory.ownerId.toString()] -= decay.decayApplied;

      totalDecayApplied += decay.decayApplied;
    }

    if (territoryUpdates.length === 0) {
      logger.info('✅ No territories eligible for decay');
      return;
    }

    // 3. Execute bulk operations
    logger.info(`💾 Bulk updating ${territoryUpdates.length} territories...`);
    const territoryResult = await Territory.bulkWrite(territoryUpdates, { ordered: false });

    // 4. Insert ledger entries (immutable audit log)
    logger.info(`📝 Creating ${ledgerEntries.length} ledger entries...`);
    await CreditLedger.insertMany(ledgerEntries, { ordered: false });

    // 5. Update user credit balances
    logger.info(`👥 Updating ${Object.keys(userCreditsChange).length} user credit balances...`);
    const userUpdates = [];
    for (const [userId, creditDelta] of Object.entries(userCreditsChange)) {
      userUpdates.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(userId) },
          update: {
            $inc: { credits: creditDelta }
          }
        }
      });
    }
    if (userUpdates.length > 0) {
      await User.bulkWrite(userUpdates, { ordered: false });
    }

    // 6. Log results
    logger.info(
      `✅ Decay sweep complete!\n` +
      `   📍 Territories updated: ${territoryResult.modifiedCount}\n` +
      `   📊 Total credits decayed: ${totalDecayApplied.toFixed(2)}\n` +
      `   ⚔️ Skirmish borders decayed: ${skirmishDecayCount}\n` +
      `   🔗 Ledger entries created: ${ledgerEntries.length}\n` +
      `   👥 Users affected: ${Object.keys(userCreditsChange).length}`
    );

    // 7. Emit event for monitoring
    process.emit('decay:complete', {
      territoriesUpdated: territoryResult.modifiedCount,
      totalDecayApplied: totalDecayApplied.toFixed(2),
      skirmishDecayCount,
      ledgerEntriesCreated: ledgerEntries.length,
      usersAffected: Object.keys(userCreditsChange).length,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('❌ Decay sweep failed:', error.message);
    process.emit('decay:error', { error: error.message, timestamp: new Date() });
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// CRON SCHEDULING
// ─────────────────────────────────────────────────────────────

async function startDecayCron() {
  // Connect to MongoDB
  await connectDB();

  logger.info('🕐 Decay cron initialized');
  logger.info('⏰ Scheduled: Every day at 00:00 UTC (midnight)');

  // Schedule: Every day at midnight UTC
  // Cron format: minute hour day-of-month month day-of-week
  // 0 0 * * * = 00:00 every day
  const job = cron.schedule('0 0 * * *', async () => {
    logger.info('⏳ Decay cron triggered...');
    await runDecaySweep();
  });

  // Also allow manual trigger via env flag (for testing)
  if (process.env.DECAY_RUN_IMMEDIATE === 'true') {
    logger.warn('⚠️  DECAY_RUN_IMMEDIATE=true — Running decay immediately for testing');
    await runDecaySweep();
  }

  return job;
}

// ─────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────

if (require.main === module) {
  startDecayCron()
    .then(() => {
      logger.info('🚀 Decay cron service running. Press Ctrl+C to stop.');
      // Keep process alive
      process.on('SIGINT', () => {
        logger.info('🛑 Shutting down decay cron service...');
        process.exit(0);
      });
    })
    .catch((error) => {
      logger.error('Failed to start decay cron:', error);
      process.exit(1);
    });
}

module.exports = { startDecayCron, runDecaySweep };
