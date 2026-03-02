// utils/leaderboard.cron.js
// ============================================================
// LEADERBOARD CRON — Recompute global + city ranks
// Runs every 5 minutes (or on a schedule via Render cron)
// Also updates the rank field on each User document
// ============================================================
const mongoose = require('mongoose');
const { User, LeaderboardCache, CityStats } = require('../config/models');
const { getRedis } = require('../config/redis');
require('dotenv').config();

const CACHE_TTL_SECONDS = 300;

async function runLeaderboardCron() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'territory_run' });
  const redis = await (async () => {
    const { connectRedis, getRedis } = require('../config/redis');
    await connectRedis();
    return getRedis();
  })();

  console.log('[LeaderboardCron] Starting...');

  // ── 1. Global leaderboard ─────────────────────────────────
  const globalUsers = await User.find({
    'privacySettings.hideProfile': false,
    'antiCheat.shadowBanned':      { $ne: true }, // exclude cheaters from boards
  })
    .sort({ credits: -1 })
    .limit(100)
    .select('_id username color credits totalHexes totalKm hashcode city')
    .lean();

  const globalSnapshot = globalUsers.map((u, i) => ({
    rank:       i + 1,
    userId:     u._id,
    username:   u.username,
    color:      u.color,
    credits:    u.credits,
    totalHexes: u.totalHexes,
    totalKm:    u.totalKm,
    hashcode:   u.hashcode,
  }));

  // Update rank field on each user document
  if (globalSnapshot.length > 0) {
    await User.bulkWrite(globalSnapshot.map(entry => ({
      updateOne: {
        filter: { _id: entry.userId },
        update: { $set: { rank: entry.rank } },
      },
    })));
  }

  // Write to MongoDB cache + Redis
  await LeaderboardCache.updateOne(
    { scope: 'global' },
    { $set: { scope: 'global', snapshot: globalSnapshot, computedAt: new Date() } },
    { upsert: true }
  );
  await redis.set('leaderboard:global', JSON.stringify(globalSnapshot), { EX: CACHE_TTL_SECONDS });
  console.log(`[LeaderboardCron] Global: ${globalSnapshot.length} entries`);

  // ── 2. City leaderboards ──────────────────────────────────
  const cities = await User.distinct('city', { city: { $ne: null } });

  for (const city of cities) {
    const cityUsers = await User.find({
      city,
      'privacySettings.hideProfile': false,
      'antiCheat.shadowBanned':      { $ne: true },
    })
      .sort({ credits: -1 })
      .limit(100)
      .select('_id username color credits totalHexes hashcode')
      .lean();

    const citySnapshot = cityUsers.map((u, i) => ({
      cityRank:   i + 1,
      userId:     u._id,
      username:   u.username,
      color:      u.color,
      credits:    u.credits,
      totalHexes: u.totalHexes,
      hashcode:   u.hashcode,
    }));

    await LeaderboardCache.updateOne(
      { scope: city },
      { $set: { scope: city, snapshot: citySnapshot, computedAt: new Date() } },
      { upsert: true }
    );
    await redis.set(
      `leaderboard:city:${city.toLowerCase()}`,
      JSON.stringify(citySnapshot),
      { EX: CACHE_TTL_SECONDS }
    );
  }
  console.log(`[LeaderboardCron] Updated ${cities.length} city leaderboards`);

  await mongoose.disconnect();
}

runLeaderboardCron().catch(err => {
  console.error('[LeaderboardCron] Fatal:', err);
  process.exit(1);
});
