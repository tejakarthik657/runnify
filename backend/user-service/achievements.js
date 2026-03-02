// user-service/achievements.js
// ============================================================
// ACHIEVEMENTS ENGINE
// Checks + awards achievements after every run completion
// ============================================================
const { User, Run, Invasion, UserAchievement, AchievementDef, Notification } = require('../config/models');

// ─────────────────────────────────────────────────────────────
// ACHIEVEMENT DEFINITIONS
// Each definition has:
//   key          — unique identifier
//   name         — display name
//   description  — shown to user
//   icon         — emoji shorthand for frontend
//   check(userId, runSummary, user) → boolean
// ─────────────────────────────────────────────────────────────
const ACHIEVEMENT_DEFINITIONS = [
  // ── First actions ─────────────────────────────────────────
  {
    key: 'first_run',
    name: 'First Steps',
    description: 'Complete your first run.',
    icon: '👟',
    check: async (userId) => {
      const count = await Run.countDocuments({ userId, status: 'ended' });
      return count >= 1;
    },
  },
  {
    key: 'first_invasion',
    name: 'Invader',
    description: 'Invade your first enemy territory.',
    icon: '⚔️',
    check: async (userId) => {
      const count = await Invasion.countDocuments({ attackerId: userId });
      return count >= 1;
    },
  },
  {
    key: 'first_defense',
    name: 'Defender',
    description: 'Have your territory invaded at least once.',
    icon: '🛡️',
    check: async (userId) => {
      const count = await Invasion.countDocuments({ defenderId: userId });
      return count >= 1;
    },
  },

  // ── Hex count milestones ───────────────────────────────────
  {
    key: 'hexes_10',
    name: 'Block Captain',
    description: 'Own 10 hexes simultaneously.',
    icon: '🏠',
    check: async (userId, _run, user) => user.totalHexes >= 10,
  },
  {
    key: 'hexes_50',
    name: 'Neighborhood Boss',
    description: 'Own 50 hexes simultaneously.',
    icon: '🏘️',
    check: async (userId, _run, user) => user.totalHexes >= 50,
  },
  {
    key: 'hexes_100',
    name: 'District Lord',
    description: 'Own 100 hexes simultaneously.',
    icon: '🏙️',
    check: async (userId, _run, user) => user.totalHexes >= 100,
  },
  {
    key: 'hexes_500',
    name: 'City Overlord',
    description: 'Own 500 hexes simultaneously.',
    icon: '👑',
    check: async (userId, _run, user) => user.totalHexes >= 500,
  },

  // ── Distance milestones ────────────────────────────────────
  {
    key: 'km_10',
    name: 'Weekend Warrior',
    description: 'Run a total of 10 km.',
    icon: '🏃',
    check: async (userId, _run, user) => user.totalKm >= 10,
  },
  {
    key: 'km_50',
    name: 'Half-Century',
    description: 'Run a total of 50 km.',
    icon: '🎽',
    check: async (userId, _run, user) => user.totalKm >= 50,
  },
  {
    key: 'km_100',
    name: 'Century Runner',
    description: 'Run a total of 100 km.',
    icon: '💯',
    check: async (userId, _run, user) => user.totalKm >= 100,
  },
  {
    key: 'km_500',
    name: 'Iron Legs',
    description: 'Run a total of 500 km.',
    icon: '🦾',
    check: async (userId, _run, user) => user.totalKm >= 500,
  },

  // ── Single run feats ──────────────────────────────────────
  {
    key: 'run_10_hexes',
    name: 'Grid Pusher',
    description: 'Claim 10+ hexes in a single run.',
    icon: '📐',
    check: async (userId, runSummary) => (runSummary?.hexesClaimed || 0) >= 10,
  },
  {
    key: 'run_50_hexes',
    name: 'Hex Blitz',
    description: 'Claim 50+ hexes in a single run.',
    icon: '⚡',
    check: async (userId, runSummary) => (runSummary?.hexesClaimed || 0) >= 50,
  },
  {
    key: 'run_5_invasions',
    name: 'Warlord',
    description: 'Invade 5+ enemy hexes in a single run.',
    icon: '🗡️',
    check: async (userId, runSummary) => (runSummary?.hexesInvaded || 0) >= 5,
  },
  {
    key: 'run_peak_hour',
    name: 'Early Bird',
    description: 'Complete a run during peak hours.',
    icon: '🌅',
    check: async (userId, runSummary) => runSummary?.peakMultiplier > 1.0,
  },

  // ── Credits milestones ────────────────────────────────────
  {
    key: 'credits_500',
    name: 'Credit Farmer',
    description: 'Accumulate 500 total credits.',
    icon: '💰',
    check: async (userId, _run, user) => user.credits >= 500,
  },
  {
    key: 'credits_5000',
    name: 'High Earner',
    description: 'Accumulate 5000 total credits.',
    icon: '💎',
    check: async (userId, _run, user) => user.credits >= 5000,
  },
];

// ─────────────────────────────────────────────────────────────
// SEED ACHIEVEMENT DEFINITIONS
// Populate AchievementDef collection on startup (idempotent)
// ─────────────────────────────────────────────────────────────
async function seedAchievementDefs() {
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    await AchievementDef.updateOne(
      { slug: def.key },
      {
        $setOnInsert: {
          slug: def.key,
          name: def.name,
          description: def.description,
          icon: def.icon,
        },
      },
      { upsert: true }
    );
  }
  console.log(`[Achievements] Seeded ${ACHIEVEMENT_DEFINITIONS.length} definitions`);
}

// ─────────────────────────────────────────────────────────────
// CHECK AND AWARD ACHIEVEMENTS
// Called at end of every run. Evaluates all achievements,
// awards new ones, and returns list of newly earned.
// ─────────────────────────────────────────────────────────────
async function checkAndAwardAchievements(userId, runSummary) {
  const user = await User.findById(userId).select('totalHexes totalKm credits').lean();
  if (!user) throw new Error('User not found');

  const newAchievements = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    // Check if already earned
    const earned = await UserAchievement.findOne({ userId, achievementSlug: def.key });
    if (earned) continue; // Already have this one

    // Evaluate check function
    const checkResult = await def.check(userId, runSummary, user);
    if (!checkResult) continue; // Not yet earned

    // Award it
    const achievement = await UserAchievement.create({
      userId,
      achievementSlug: def.key,
      earnedAt: new Date(),
    });

    newAchievements.push({
      key: def.key,
      name: def.name,
      description: def.description,
      icon: def.icon,
    });

    // Create notification
    await Notification.create({
      userId,
      type: 'achievement',
      read: false,
      payload: {
        key: def.key,
        name: def.name,
        description: def.description,
        icon: def.icon,
      },
      ts: new Date(),
    });
  }

  return newAchievements;
}

module.exports = {
  ACHIEVEMENT_DEFINITIONS,
  seedAchievementDefs,
  checkAndAwardAchievements,
};
