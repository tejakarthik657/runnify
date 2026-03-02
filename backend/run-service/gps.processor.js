// run-service/gps.processor.js  [v3 — anti-cheat integrated]
// ============================================================
// END-OF-RUN GPS PROCESSING
// ORDER:  validate → anti-cheat → dwell filter → write territory → credits
// Anti-cheat runs BEFORE anything is written to DB.
// Disqualified runs: GPS saved for evidence, no territory changes.
// ============================================================
const {
  Territory, Run, GpsPoint, CreditLedger, Invasion, User, Notification,
} = require('../config/models');
const { processGpsBatch, calculateDistanceKm } = require('./h3.service');
const { calculateRunCredits, calculateDefenderLoss,
  freshHexCreditValue } = require('./credit.engine');
const { runAntiCheat } = require('./anticheat.engine');
const { checkAndAwardAchievements } = require('../user-service/achievements');
const {
  pushInvasionAlert,
  pushAchievement,
  pushNewRival
} = require('../notification-service/push');

/**
 * Main run processing pipeline.
 *
 * @param {string} runId
 * @param {string} userId
 * @param {Array}  allGpsPoints  — raw points from Redis buffer
 * @param {string} requestIp     — runner's IP (passed from HTTP route)
 * @param {object} clientMeta    — optional: { isMockLocation: bool }
 */
async function processEndOfRun(runId, userId, allGpsPoints, requestIp = null, clientMeta = {}) {

  // ── STEP 1: Validate + deduplicate GPS points ─────────────
  const { validPoints, hexIds, rejectedCount } = processGpsBatch(allGpsPoints);
  if (validPoints.length === 0) throw new Error('No valid GPS points in this run');

  const kmDistance = calculateDistanceKm(validPoints);
  const hexIdArray = [...hexIds];

  // ── STEP 2: Pre-classify hexes (needed for farming check) ─
  const existingTerritories = await Territory.find({ hexId: { $in: hexIdArray } }).lean();
  const territoryMap = new Map(existingTerritories.map(t => [t.hexId, t]));

  const rawClaimed = [];
  const rawInvaded = [];
  const rawRevisited = [];

  for (const hexId of hexIdArray) {
    const existing = territoryMap.get(hexId);
    if (!existing) {
      rawClaimed.push(hexId);
    } else if (existing.ownerId.toString() === userId.toString()) {
      rawRevisited.push(hexId);
    } else {
      rawInvaded.push(hexId);
    }
  }

  // ── STEP 3: RUN ANTI-CHEAT ────────────────────────────────
  // This is the gate. Nothing writes to DB until this passes.
  const ac = await runAntiCheat(
    validPoints,
    kmDistance,
    rawInvaded,
    userId,
    requestIp,
    clientMeta
  );

  // ── STEP 4: Handle DISQUALIFIED runs ──────────────────────
  // Save GPS for evidence + human review. Zero territory changes.
  if (ac.verdict === 'disqualified') {
    await GpsPoint.insertMany(
      validPoints.map(pt => ({
        runId, userId, lat: pt.lat, lng: pt.lng,
        accuracy: pt.accuracy, hexId: pt.hexId, ts: new Date(pt.ts),
      })),
      { ordered: false }
    );

    const flaggedRun = await Run.findByIdAndUpdate(runId, {
      $set: {
        status: 'flagged',
        endedAt: new Date(),
        gpsPointCount: validPoints.length,
        creditsEarned: 0,
        kmDistance,
        antiCheat: {
          verdict: ac.verdict,
          totalWeight: ac.score.totalWeight,
          flagCount: ac.score.flagCount,
          flags: ac.score.flags,
          checkedAt: new Date(),
        },
      },
    }, { new: true });

    // Increment user's cheat strike counter (used by community policing)
    await User.updateOne({ _id: userId }, { $inc: { 'antiCheat.strikeCount': 1 } });

    return {
      run: flaggedRun,
      territoryChanges: [],
      antiCheat: ac,
      summary: {
        hexesClaimed: 0, hexesInvaded: 0, hexesRevisited: 0,
        hexesFilteredByDwell: 0, creditsEarned: 0, kmDistance,
        validGpsPoints: validPoints.length, rejectedGpsPoints: rejectedCount,
        antiCheatVerdict: ac.verdict,
        antiCheatMessage: ac.score.message,
        newAchievements: [],
      },
    };
  }

  // ── STEP 5: Apply dwell-time filter ───────────────────────
  // validHexes = only hexes where runner spent ≥8 seconds inside
  // Drive-bys are silently removed — cheater gets no feedback on which hexes failed
  const validHexSet = new Set(ac.validHexes);
  const hexesClaimed = rawClaimed.filter(h => validHexSet.has(h));
  const hexesInvaded = rawInvaded.filter(h => validHexSet.has(h));
  const hexesRevisited = rawRevisited; // revisits always count (just refresh decay timer)

  // ── STEP 6: Calculate credits with anti-cheat multiplier ──
  const creditResult = calculateRunCredits(hexesClaimed, hexesInvaded, Date.now());
  const creditsEarned = Math.floor(creditResult.total * ac.creditMultiplier);

  // ── STEP 7: Load runner & Update Streak ───────────────────
  const runner = await User.findById(userId);
  if (!runner) throw new Error('Runner user not found');
  const now = new Date();

  // Streak Calculation (Section 2.2 Psychological Docs)
  let newStreak = (runner.stats.currentStreak || 0);
  const lastRun = runner.stats.lastRunDate;

  if (!lastRun) {
    newStreak = 1;
  } else {
    const diffMs = now.getTime() - new Date(lastRun).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 1.0) {
      // Still within same day or very recent - streak maintained (don't increment twice in 24h)
    } else if (diffDays <= 2.0) {
      // Ran yesterday - increment
      newStreak += 1;
    } else {
      // Missed a day - reset
      newStreak = 1;
    }
  }

  // ── STEP 8: Write new hex claims ──────────────────────────
  if (hexesClaimed.length > 0) {
    await Territory.bulkWrite(hexesClaimed.map(hexId => ({
      updateOne: {
        filter: { hexId },
        update: {
          $set: {
            hexId, ownerId: userId, ownerUsername: runner.username,
            ownerColor: runner.color, ownerCity: runner.city,
            creditValue: freshHexCreditValue(), claimedAt: now,
            lastActiveAt: now, invasionCount: 0, invasionHistory: [],
            resolution: 9, schemaVersion: 'v1',
          },
        },
        upsert: true,
      },
    })));
  }

  // ── STEP 9: Refresh revisited hexes (stops decay clock) ───
  if (hexesRevisited.length > 0) {
    await Territory.updateMany(
      { hexId: { $in: hexesRevisited } },
      { $set: { lastActiveAt: now } }
    );
  }

  // ── STEP 10: Process invasions ─────────────────────────────
  const invasionEvents = [];
  const defenderNotifDocs = [];
  const defenderCreditDeltas = new Map();
  const territoryChanges = [];

  for (const hexId of hexesInvaded) {
    const previous = territoryMap.get(hexId);
    const creditsLost = calculateDefenderLoss(1);
    const defId = previous.ownerId.toString();

    await Territory.updateOne({ hexId }, {
      $set: {
        ownerId: userId, ownerUsername: runner.username,
        ownerColor: runner.color, ownerCity: runner.city,
        creditValue: freshHexCreditValue(), lastActiveAt: now, lastInvadedAt: now,
      },
      $inc: { invasionCount: 1 },
      $push: {
        invasionHistory: {
          $each: [{
            invaderId: userId, invaderUsername: runner.username,
            invaderColor: runner.color, previousOwnerId: previous.ownerId, ts: now,
          }],
          $slice: -20,
        },
      },
    });

    territoryChanges.push({
      hexId, newOwnerColor: runner.color, newOwnerUsername: runner.username,
    });
    defenderCreditDeltas.set(defId, (defenderCreditDeltas.get(defId) || 0) - creditsLost);

    invasionEvents.push({
      hexId, attackerId: userId, attackerUsername: runner.username,
      attackerColor: runner.color, defenderId: previous.ownerId,
      defenderUsername: previous.ownerUsername, runId, creditsTransferred: creditsLost, ts: now,
    });

  }

  // Rivalry Logic (Section 3.1 Social Dominance)
  let rivalEntry = runner.rivals.find(r => r.userId.toString() === defId);
  if (!rivalEntry) {
    runner.rivals.push({ userId: previous.ownerId, clashCount: 1, lastClashAt: now });
  } else {
    rivalEntry.clashCount += 1;
    rivalEntry.lastClashAt = now;
    if (rivalEntry.clashCount === 3 && !rivalEntry.named) {
      rivalEntry.named = true;
      // Notify both parties of the new Rivalry
      pushNewRival(userId, { rivalUsername: previous.ownerUsername });
      pushNewRival(defId, { rivalUsername: runner.username });
    }
  }

  defenderNotifDocs.push({
    userId: previous.ownerId, type: 'invasion_alert', read: false,
    title: '⚠️ TERRITORY SEIZED', // Loss-Framed Header
    body: `${runner.username.toUpperCase()} has SEIZED your territory in ${previous.city || 'Sector_7'}. Respond immediately to reclaim!`,
    payload: {
      hexId, attackerUsername: runner.username,
      attackerColor: runner.color, creditsLost,
    },
    ts: now,
  });
}

if (invasionEvents.length > 0) {
  await Invasion.insertMany(invasionEvents);
  await Notification.insertMany(defenderNotifDocs);
}

// ── STEP 11: Debit defenders + live-push alerts ─────────────
for (const [defId, delta] of defenderCreditDeltas.entries()) {
  const inv = invasionEvents.find(i => i.defenderId.toString() === defId);
  if (inv) {
    pushInvasionAlert(defId, {
      hexId: inv.hexId, attackerUsername: inv.attackerUsername,
      attackerColor: inv.attackerColor, creditsLost: Math.abs(delta),
    });
  }
  const defender = await User.findById(defId);
  if (!defender) continue;
  const newBal = Math.max(0, defender.credits + delta);
  await User.updateOne({ _id: defId }, { $set: { credits: newBal } });
  await CreditLedger.create({
    userId: defId, delta, reason: 'hex_lost', runId, balanceAfter: newBal, ts: now,
  });
}

// ── STEP 12: Credit runner & Prestige Check ───────────────
const newBalance = runner.credits + creditsEarned;

// Prestige Check (#1 Rank Unlock)
let prestigeUpdate = {};
if (runner.city) {
  const topInCity = await User.findOne({ city: runner.city, isBanned: false }).sort({ credits: -1 }).select('credits').lean();
  if (!topInCity || newBalance > topInCity.credits) {
    if (!runner.isPrestige) {
      prestigeUpdate = {
        isPrestige: true,
        $addToSet: { colorUnlocked: '#FFFFFF' }
      };
    }
  }
}

await User.updateOne({ _id: userId }, {
  $set: {
    credits: newBalance,
    lastActiveAt: now,
    'stats.currentStreak': newStreak,
    'stats.lastRunDate': now,
    rivals: runner.rivals,
    ...prestigeUpdate
  },
  $inc: { totalHexes: hexesClaimed.length + hexesInvaded.length, totalKm: kmDistance },
});

await CreditLedger.create({
  userId, amount: creditsEarned, type: 'run_bonus', // Fixed field names to match schema.js
  refId: runId, balanceAfter: newBalance, occurredAt: now,
});

// ── STEP 13: Persist GPS points ────────────────────────────
await GpsPoint.insertMany(
  validPoints.map(pt => ({
    runId, userId, lat: pt.lat, lng: pt.lng,
    accuracy: pt.accuracy, hexId: pt.hexId, ts: new Date(pt.ts),
  })),
  { ordered: false }
);

// ── STEP 14: Finalise Run document ─────────────────────────
const updatedRun = await Run.findByIdAndUpdate(runId, {
  $set: {
    status: 'ended',
    endedAt: now,
    gpsPointCount: validPoints.length,
    hexesClaimed,
    hexesInvaded,
    hexesRevisited,
    creditsEarned,
    kmDistance,
    antiCheat: {
      verdict: ac.verdict,
      creditMultiplier: ac.creditMultiplier,
      totalWeight: ac.score.totalWeight,
      flagCount: ac.score.flagCount,
      checkedAt: now,
    },
  },
}, { new: true });

// ── STEP 15: Achievements + push ──────────────────────────
const newAchievements = await checkAndAwardAchievements(userId, {
  hexesClaimed: hexesClaimed.length, hexesInvaded: hexesInvaded.length,
  peakMultiplier: creditResult.peakMultiplier, creditsEarned,
});
for (const ach of newAchievements) pushAchievement(userId, ach);

// ── STEP 16: Leaderboard cache invalidation ────────────────
try {
  const { invalidateLeaderboardCache } = require('../leaderboard-service/routes');
  await invalidateLeaderboardCache(runner.city);
} catch (_) { /* non-critical */ }

return {
  run: updatedRun,
  territoryChanges,
  antiCheat: ac,
  summary: {
    hexesClaimed: hexesClaimed.length,
    hexesInvaded: hexesInvaded.length,
    hexesRevisited: hexesRevisited.length,
    hexesFilteredByDwell: ac.failedHexes.length,
    creditsEarned,
    creditBreakdown: creditResult,
    creditMultiplier: ac.creditMultiplier,
    kmDistance,
    validGpsPoints: validPoints.length,
    rejectedGpsPoints: rejectedCount,
    antiCheatVerdict: ac.verdict,
    antiCheatMessage: ac.score.message,
    newAchievements,
  },
};
}

module.exports = { processEndOfRun };
