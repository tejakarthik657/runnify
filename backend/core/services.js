/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       TERRITORY RUN — COMPLETE SERVICE SCRIPTS                      ║
 * ║       All business logic, queries & operations end-to-end           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const h3 = require('h3-js');
const crypto = require('crypto');
const {
  User, Territory, Run, GpsPoint, CreditLedger,
  Invasion, LeaderboardCache, Notification, ChatMessage,
  ChatRoom, AchievementDef, UserAchievement, DailyProof,
  Report, Session, CityStats,
  PLAYER_COLORS, NOTIFICATION_TYPES, SCHEMA_VERSION,
} = require('./schema');
const { getRedis } = require('../config/redis');
const h3js = require('h3-js');

const AntiCheatEngine = require('../run-service/anticheat.engine');

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

const H3_RES = 9;
const CREDITS_PER_CLAIM = 10;
const CREDITS_PER_INVASION = 25;
const CREDITS_PER_RETOUCH = 2;
const INVASION_CREDIT_LOSS = 15;   // victim loses per hex invaded
const PEAK_HOURS = [[6, 9], [17, 20]];  // 6-9am, 5-8pm
const PEAK_MULTIPLIER = 1.5;
const DECAY_RATE = 0.98;   // per 24h of inactivity
const MAX_RUN_DURATION_H = 4;
const MAX_GPS_POINTS = 500;
const MAX_RUNS_PER_DAY = 50;
const GPS_ACCURACY_LIMIT = 50;     // metres
const MAX_SPEED_KMH = 45;     // anti-cheat: flag runs with GPS > this
const ENCLOSURE_CLOSE_DISTANCE_M = 100;
const ENCLOSURE_MIN_POINTS = 10;
const ENCLOSURE_BONUS_PER_HEX = 5;


// ═══════════════════════════════════════════════════════════════════════
// USER SERVICE
// ═══════════════════════════════════════════════════════════════════════

const UserService = {

  /** Generate unique TR-XXXX hashcode */
  async generateHashcode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code, exists;
    do {
      code = 'TR-' + Array.from({ length: 4 }, () =>
        chars[Math.floor(Math.random() * chars.length)]).join('');
      exists = await User.exists({ hashcode: code });
    } while (exists);
    return code;
  },

  /** Register new user */
  async register({ username, email, passwordHash, color, city }) {
    const hashcode = await UserService.generateHashcode();
    const user = await User.create({
      username, email, passwordHash,
      color: color || '#00FF88',
      hashcode, city,
    });
    // Create city chat room for user's city if it doesn't exist
    if (city) {
      const roomId = `city:${city.toLowerCase()}`;
      await ChatRoom.updateOne(
        { roomId },
        { $set: { roomId, type: 'city', name: city, city } },
        { upsert: true }
      );
    }
    return user;
  },

  /** Fetch public profile */
  async getPublicProfile(userId) {
    const user = await User.findById(userId).select(
      'username hashcode color credits hexesOwned globalRank cityRank city stats isPrestige createdAt bio avatarUrl'
    );
    if (!user) throw new Error('User not found');
    return user.publicProfile;
  },

  /** Update stats after a run completes */
  async updateStatsAfterRun(userId, run) {
    const inc = {
      'stats.totalKm': run.distanceKm,
      'stats.totalRuns': 1,
      'stats.totalHexesClaimed': run.hexesClaimed.length,
      'stats.totalHexesInvaded': run.hexesInvaded.length,
      'stats.totalCreditsEarned': run.creditsEarned,
      credits: run.creditsEarned,
      hexesOwned: run.hexesClaimed.length, // net: invasions handled separately
    };

    const user = await User.findByIdAndUpdate(userId, {
      $inc: inc,
      $set: { lastActiveAt: new Date(), lastRunAt: new Date() },
    }, { new: true });

    // Update records
    const updates = {};
    if (run.distanceKm > (user.stats.longestRunKm || 0))
      updates['stats.longestRunKm'] = run.distanceKm;
    if (run.hexesTotal > (user.stats.mostHexesInOneRun || 0))
      updates['stats.mostHexesInOneRun'] = run.hexesTotal;
    if (run.creditsEarned > (user.stats.mostCreditsInOneRun || 0))
      updates['stats.mostCreditsInOneRun'] = run.creditsEarned;
    if (user.hexesOwned > (user.stats.peakHexesOwned || 0))
      updates['stats.peakHexesOwned'] = user.hexesOwned;

    if (Object.keys(updates).length > 0)
      await User.findByIdAndUpdate(userId, { $set: updates });

    // Update streak
    await UserService.updateStreak(userId);

    return user;
  },

  /** Increment / reset daily streak */
  async updateStreak(userId) {
    const user = await User.findById(userId).select('stats.lastRunDate stats.currentStreak stats.longestStreak');
    const today = new Date().toDateString();
    const lastRun = user.stats.lastRunDate ? new Date(user.stats.lastRunDate).toDateString() : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    let newStreak = user.stats.currentStreak;
    if (lastRun === today) return; // already updated today
    if (lastRun === yesterday) newStreak += 1;
    else newStreak = 1; // streak broken

    const longestStreak = Math.max(newStreak, user.stats.longestStreak || 0);
    await User.findByIdAndUpdate(userId, {
      $set: {
        'stats.currentStreak': newStreak,
        'stats.longestStreak': longestStreak,
        'stats.lastRunDate': new Date(),
      }
    });
  },

  /** Unlock prestige white color on achieving city rank #1 */
  async checkPrestige(userId) {
    const user = await User.findById(userId);
    if (user.cityRank === 1 && !user.isPrestige) {
      await User.findByIdAndUpdate(userId, {
        $set: { isPrestige: true },
        $addToSet: { colorUnlocked: '#FFFFFF' },
      });
    }
  },

  /** Search users by username or hashcode */
  async search(query, limit = 10) {
    const regex = new RegExp(query, 'i');
    return User.find({
      $or: [{ username: regex }, { hashcode: regex }],
      isBanned: false,
    })
      .select('username hashcode color credits globalRank city isPrestige')
      .limit(limit);
  },
};


// ═══════════════════════════════════════════════════════════════════════
// H3 SERVICE
// ═══════════════════════════════════════════════════════════════════════

const H3Service = {

  /** Convert single GPS point to H3 hex ID */
  latLngToHex(lat, lng) {
    return h3.latLngToCell(lat, lng, H3_RES);
  },

  /** Convert array of GPS points to unique hex IDs */
  pointsToHexIds(points) {
    const seen = new Set();
    for (const pt of points) {
      if (pt.isValid !== false) {
        seen.add(h3.latLngToCell(pt.lat, pt.lng, H3_RES));
      }
    }
    return [...seen];
  },

  /** Get lat/lng center of a hex */
  hexCenter(hexId) {
    const [lat, lng] = h3.cellToLatLng(hexId);
    return { lat, lng };
  },

  /** Get bounding box hexes for map queries */
  hexesInBoundingBox(minLat, minLng, maxLat, maxLng) {
    const polygon = [
      [minLat, minLng],
      [maxLat, minLng],
      [maxLat, maxLng],
      [minLat, maxLng],
    ];
    return h3.polygonToCells(polygon, H3_RES);
  },

  /** Validate GPS point — returns cleaned point or null */
  validateGpsPoint(point, prevPoint, seq) {
    if (!point.lat || !point.lng) return null;
    if (point.accuracy > GPS_ACCURACY_LIMIT) return { ...point, isValid: false };

    if (prevPoint) {
      const distM = h3.greatCircleDistance(
        [prevPoint.lat, prevPoint.lng],
        [point.lat, point.lng], 'm'
      );
      const dtS = ((point.ts || point.timestamp) - (prevPoint.ts || prevPoint.timestamp)) / 1000;
      const speedKmh = dtS > 0 ? (distM / 1000) / (dtS / 3600) : 0;

      if (speedKmh > MAX_SPEED_KMH) {
        return { ...point, isValid: false, speedKmh };
      }
    }
    return { ...point, seq, isValid: true };
  },
};


// ═══════════════════════════════════════════════════════════════════════
// CREDIT ENGINE
// ═══════════════════════════════════════════════════════════════════════

const CreditEngine = {

  /** Check if current time is peak hour */
  isPeakHour() {
    const hour = new Date().getHours();
    return PEAK_HOURS.some(([start, end]) => hour >= start && hour < end);
  },

  /** Calculate credits for a completed run */
  calculate({ hexesClaimed, hexesInvaded, hexesRetouched }) {
    const multiplier = CreditEngine.isPeakHour() ? PEAK_MULTIPLIER : 1.0;
    const fromClaims = hexesClaimed.length * CREDITS_PER_CLAIM;
    const fromInvasions = hexesInvaded.length * CREDITS_PER_INVASION;
    const fromRetouch = hexesRetouched.length * CREDITS_PER_RETOUCH;
    const total = Math.floor((fromClaims + fromInvasions + fromRetouch) * multiplier);
    return { total, fromClaims, fromInvasions, fromRetouch, multiplier };
  },

  /** Apply decay to inactive territories (called by nightly cron) */
  async applyGlobalDecay() {
    const threshold = new Date(Date.now() - 86400000); // 24h ago
    const stale = await Territory.find({ lastActiveAt: { $lt: threshold } });
    let totalDecayed = 0;

    for (const territory of stale) {
      const hoursInactive = (Date.now() - territory.lastActiveAt) / 3600000;
      const daysInactive = Math.floor(hoursInactive / 24);
      const newDecayFactor = Math.pow(DECAY_RATE, daysInactive);
      const creditLoss = Math.floor(territory.creditValue * (1 - newDecayFactor));

      if (creditLoss > 0) {
        await Territory.findByIdAndUpdate(territory._id, {
          $set: { decayFactor: newDecayFactor },
          $inc: { creditValue: -creditLoss },
        });
        await User.findByIdAndUpdate(territory.ownerId, { $inc: { credits: -creditLoss } });
        await CreditLedger.create({
          userId: territory.ownerId,
          amount: -creditLoss,
          balanceAfter: 0, // filled in properly in prod
          type: 'decay',
          hexIds: [territory.hexId],
          hexCount: 1,
          note: `Decay after ${daysInactive} inactive days`,
          occurredAt: new Date(),
          schemaVersion: SCHEMA_VERSION,
        });
        totalDecayed += creditLoss;
      }
    }
    console.log(`Decay cron: processed ${stale.length} territories, ${totalDecayed} total credits decayed`);
  },
};


// ═══════════════════════════════════════════════════════════════════════
// RUN SERVICE
// ═══════════════════════════════════════════════════════════════════════

const RunService = {

  /** Check if user can start a new run (daily limit) */
  async canStartRun(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await Run.countDocuments({
      userId,
      startedAt: { $gte: today },
      isActive: false,
    });

    // Auto-cleanup: force-end any stale active runs (older than 6 hours)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const staleRun = await Run.findOne({
      userId,
      isActive: true,
      startedAt: { $lt: sixHoursAgo }
    });

    if (staleRun) {
      await Run.updateOne(
        { _id: staleRun._id },
        {
          $set: {
            isActive: false,
            endedAt: new Date(),
            isProcessed: true,
            processedAt: new Date()
          }
        }
      );
    } else {
      // Check for recent active run (not stale)
      const active = await Run.findOne({ userId, isActive: true });
      if (active) {
        const err = new Error('A run is already in progress');
        err.status = 403;
        throw err;
      }
    }

    if (count >= MAX_RUNS_PER_DAY) {
      const err = new Error(`Daily run limit of ${MAX_RUNS_PER_DAY} reached`);
      err.status = 403;
      throw err;
    }
    return true;
  },

  /** Start a new run session */
  async startRun(userId, { lat, lng, city }) {
    // Validate GPS coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const err = new Error('Valid GPS coordinates required to start a run');
      err.status = 400;
      throw err;
    }

    await RunService.canStartRun(userId);
    const user = await User.findById(userId).select('username color');
    if (!user) {
      const err = new Error('Commander profile not found');
      err.status = 404;
      throw err;
    }
    const run = await Run.create({
      userId,
      username: user.username,
      userColor: user.color,
      startedAt: new Date(),
      startLocation: { type: 'Point', coordinates: [lng, lat] },
      city,
      isActive: true,
      schemaVersion: SCHEMA_VERSION,
    });
    return run;
  },

  /** Ingest a batch of GPS points during an active run */
  async ingestGpsPoints(runId, userId, rawPoints) {
    const run = await Run.findOne({ _id: runId, userId, isActive: true });
    if (!run) throw new Error('No active run found');

    const currentCount = run.gpsPointCount;
    if (currentCount >= MAX_GPS_POINTS) return { dropped: rawPoints.length };

    const toInsert = [];
    let prev = null;
    for (let i = 0; i < rawPoints.length; i++) {
      const pt = H3Service.validateGpsPoint(rawPoints[i], prev, currentCount + i);
      if (!pt) continue;
      toInsert.push({
        runId: run._id,
        userId,
        seq: pt.seq,
        location: { type: 'Point', coordinates: [pt.lng, pt.lat] },
        accuracy: pt.accuracy,
        altitude: pt.altitude || null,
        speed: pt.speed || null,
        hexId: pt.isValid ? H3Service.latLngToHex(pt.lat, pt.lng) : null,
        recordedAt: new Date(pt.ts || pt.timestamp),
        isValid: pt.isValid,
      });
      if (pt.isValid) prev = pt;
    }

    if (toInsert.length > 0) {
      await GpsPoint.insertMany(toInsert, { ordered: false });
      await Run.findByIdAndUpdate(runId, {
        $inc: { gpsPointCount: toInsert.length },
      });
    }

    return { accepted: toInsert.filter(p => p.isValid).length, dropped: rawPoints.length - toInsert.length };
  },

  /** End a run: process hexes, award credits, create invasions */
  async endRun(runId, userId, { lat, lng }, requestIp = null, clientMeta = {}) {
    const run = await Run.findOne({ _id: runId, userId, isActive: true });
    if (!run) throw new Error('No active run found');

    // Fetch all valid GPS points for this run
    // Fetch all current points from DB
    const dbPoints = await GpsPoint.find({ runId, isValid: true })
      .sort('seq')
      .select('location hexId accuracy altitude recordedAt');

    // PLUS pull any pending from Redis (simulation or socket delay)
    const redis = getRedis();
    const redisKey = `run:gps:${runId}`;
    let bufferedPoints = [];
    try {
      const raw = await redis.lrange(redisKey, 0, -1);
      if (raw && raw.length > 0) {
        bufferedPoints = raw.map(str => {
          const p = JSON.parse(str);
          return {
            location: { type: 'Point', coordinates: [p.lng, p.lat] },
            hexId: p.hexId || h3js.latLngToCell(p.lat, p.lng, 9),
            accuracy: p.accuracy || 10,
            altitude: p.altitude || 500,
            recordedAt: new Date(p.ts || p.timestamp),
          };
        });
        // Clear buffer so we don't double-process if endRun is retried
        await redis.del(redisKey);
      }
    } catch (_) { /* non-critical if redis fails */ }

    const points = [...dbPoints, ...bufferedPoints];

    // Get unique hexes
    const allTouchedHexIds = [...new Set(points.map(p => p.hexId).filter(Boolean))];

    // Calculate distance
    const distanceKm = RunService._calcDistanceKm(points);

    // ANTI-CHEAT CHECK (before classification to filter points/hexes)
    const acResult = await AntiCheatEngine.runAntiCheat(
      points.map(p => ({
        lat: p.location.coordinates[1],
        lng: p.location.coordinates[0],
        ts: p.recordedAt instanceof Date ? p.recordedAt.getTime() : p.recordedAt,
        hexId: p.hexId,
        accuracy: p.accuracy
      })),
      distanceKm,
      [], // invasions not yet classified
      userId,
      requestIp,
      clientMeta
    );

    // Only process hexes that passed anti-cheat filters (e.g. dwell time)
    const validHexSet = new Set(acResult.validHexes);
    let touchedHexIds = allTouchedHexIds.filter(h => validHexSet.has(h));

    // Enclosure capture: closed-loop run claims enclosed area hexes
    const enclosedHexes = RunService._detectEnclosedHexes(points);
    if (enclosedHexes.length > 0) {
      const merged = new Set([...touchedHexIds, ...enclosedHexes]);
      touchedHexIds = [...merged];
    }

    // Classify hexes
    const existingTerritories = await Territory.find({ hexId: { $in: touchedHexIds } })
      .select('hexId ownerId ownerUsername ownerColor creditValue');
    const existingMap = new Map(existingTerritories.map(t => [t.hexId, t]));

    const hexesClaimed = [];
    const hexesInvaded = [];
    const hexesRetouched = [];
    const invasionEvents = [];
    const territoryChanges = [];

    for (const hexId of touchedHexIds) {
      const existing = existingMap.get(hexId);
      if (!existing) {
        hexesClaimed.push(hexId);
      } else if (existing.ownerId.toString() === userId.toString()) {
        hexesRetouched.push(hexId);
      } else {
        hexesInvaded.push(hexId);
        invasionEvents.push({ hexId, victim: existing });
      }
    }

    // Calculate credits (multiplied by AC verdict)
    const rawCredits = CreditEngine.calculate({ hexesClaimed, hexesInvaded, hexesRetouched });
    const enclosureBonus = enclosedHexes.length * ENCLOSURE_BONUS_PER_HEX;
    const finalCreditsTotal = Math.floor((rawCredits.total + enclosureBonus) * acResult.creditMultiplier);


    // Duration check
    const durationSeconds = Math.floor((Date.now() - run.startedAt.getTime()) / 1000);
    if (durationSeconds > MAX_RUN_DURATION_H * 3600) {
      await Run.findByIdAndUpdate(runId, { $set: { isFlagged: true, flagReason: 'exceeded_max_duration' } });
    }

    // Upsert territory ownership
    const user = await User.findById(userId).select('username color hashcode faction');
    
    // Faction color mapping
    const FACTION_COLORS = {
      red: '#FF4444',
      blue: '#4488FF',
      green: '#44FF88'
    };
    const factionColor = user.faction ? FACTION_COLORS[user.faction] : null;
    
    const bulkTerritoryOps = [];

    // Claims: new territories
    for (const hexId of hexesClaimed) {
      const center = H3Service.hexCenter(hexId);
      territoryChanges.push({
        hexId,
        newOwnerColor: user.color,
        newOwnerUsername: user.username,
      });
      bulkTerritoryOps.push({
        updateOne: {
          filter: { hexId },
          update: {
            $set: {
              ownerId: userId, ownerUsername: user.username,
              ownerColor: user.color, ownerHashcode: user.hashcode,
              faction: user.faction, factionColor,
              claimedAt: new Date(), lastActiveAt: new Date(),
              creditValue: 10, decayFactor: 1.0,
              center: { type: 'Point', coordinates: [center.lng, center.lat] },
              city: run.city,
              schemaVersion: SCHEMA_VERSION,
            }
          },
          upsert: true,
        }
      });
    }

    // Invasions: transfer ownership
    for (const { hexId, victim } of invasionEvents) {
      const center = H3Service.hexCenter(hexId);
      territoryChanges.push({
        hexId,
        newOwnerColor: user.color,
        newOwnerUsername: user.username,
      });
      bulkTerritoryOps.push({
        updateOne: {
          filter: { hexId },
          update: {
            $set: {
              ownerId: userId, ownerUsername: user.username,
              ownerColor: user.color, ownerHashcode: user.hashcode,
              faction: user.faction, factionColor,
              claimedAt: new Date(), lastActiveAt: new Date(),
            },
            $inc: { totalInvasions: 1 },
            $push: {
              invasionLog: {
                invaderId: userId, invaderUsername: user.username,
                invaderColor: user.color, previousOwnerId: victim.ownerId,
                occurredAt: new Date(), runId,
              }
            }
          }
        }
      });
    }

    // Retouches: update lastActiveAt
    for (const hexId of hexesRetouched) {
      bulkTerritoryOps.push({
        updateOne: {
          filter: { hexId, ownerId: userId },
          update: { $set: { lastActiveAt: new Date(), decayFactor: 1.0 } }
        }
      });
    }

    if (bulkTerritoryOps.length > 0) {
      await Territory.bulkWrite(bulkTerritoryOps);
    }

    // Update faction stats in Redis (Global Territory Wars)
    if (user.faction) {
      try {
        const factionKey = `faction:hexcount:${user.faction}`;
        await redis.incrBy(factionKey, hexesClaimed.length + hexesInvaded.length);

        if (run.city) {
          const cityKey = `faction:city:${run.city}:${user.faction}`;
          await redis.incrBy(cityKey, hexesClaimed.length + hexesInvaded.length);
        }
      } catch (err) {
        console.warn('[Faction Stats] Redis update failed:', err.message);
        // Continue - faction stats are non-critical for mission completion
      }
      
      // Note: Socket.io broadcast moved to routes.js where io instance is available
    }

    // Create invasion records & notifications
    if (invasionEvents.length > 0) {
      try {
        const invasionsByVictim = {};
        for (const { hexId, victim } of invasionEvents) {
          const vid = victim.ownerId.toString();
          if (!invasionsByVictim[vid]) invasionsByVictim[vid] = { victim, hexIds: [] };
          invasionsByVictim[vid].hexIds.push(hexId);
        }

        for (const [victimId, data] of Object.entries(invasionsByVictim)) {
          const hexCount = data.hexIds.length;
          const creditsLost = hexCount * INVASION_CREDIT_LOSS;
          const creditsGained = hexCount * CREDITS_PER_INVASION;

          // Create invasion event
          const invasion = await Invasion.create({
            runId, invaderId: userId, invaderUsername: user.username,
            invaderColor: user.color,
            victimId: data.victim.ownerId, victimUsername: data.victim.ownerUsername,
            victimColor: data.victim.ownerColor,
            hexIds: data.hexIds, hexCount, hexCity: run.city,
            creditsGained, creditsLost, occurredAt: new Date(),
            schemaVersion: SCHEMA_VERSION,
          });

          // Deduct credits from victim
          await User.findByIdAndUpdate(victimId, {
            $inc: { credits: -creditsLost, hexesOwned: -hexCount, 'stats.totalHexesLost': hexCount, 'stats.totalCreditsLost': creditsLost },
          });

          // Credit ledger entry for victim loss
          await CreditLedger.create({
            userId: victimId, amount: -creditsLost,
            balanceAfter: 0, type: 'invaded_loss',
            refId: invasion._id, hexIds: data.hexIds, hexCount,
            note: `${hexCount} hexes invaded by ${user.username}`,
            occurredAt: new Date(), schemaVersion: SCHEMA_VERSION,
          });

          // Notify victim
          await NotificationService.createInvasionAlert({
            victimId, invaderUsername: user.username,
            hexCount, creditsLost, city: run.city,
            invasionId: invasion._id,
          });

          // Update rivalry
          await RunService._updateRivalry(userId, victimId);
        }
      } catch (err) {
        console.warn('[Invasion] creation failed:', err.message);
        // Continue - invasions are non-critical for mission completion
      }
    }

    // Deduct credits from newly-invaded hex owners already handled above
    // Add credits to runner
    // Add credits to runner + Update Strikes
    const userUpdate = {
      $inc: {
        credits: finalCreditsTotal,
        hexesOwned: hexesClaimed.length,
        'stats.totalCreditsEarned': finalCreditsTotal,
        'stats.totalHexesClaimed': hexesClaimed.length,
        'stats.totalHexesInvaded': hexesInvaded.length,
        'stats.totalKm': distanceKm,
        'stats.totalRuns': 1,
      },
      $set: { lastActiveAt: new Date(), lastRunAt: new Date() },
    };

    if (acResult.verdict === 'disqualified' || acResult.verdict === 'warned') {
      userUpdate.$inc['antiCheat.strikeCount'] = 1;
      userUpdate.$set['antiCheat.lastFlaggedRun'] = new Date();
    }

    const userAfter = await User.findByIdAndUpdate(userId, userUpdate, { new: true });

    // Credit ledger for runner (non-critical)
    try {
      await CreditLedger.create({
        userId, username: user.username, amount: finalCreditsTotal,
        balanceAfter: userAfter.credits,
        type: 'run_claim',
        hexIds: [...hexesClaimed, ...hexesInvaded],
        hexCount: hexesClaimed.length + hexesInvaded.length,
        multiplier: rawCredits.multiplier,
        note: `Run: ${hexesClaimed.length} claims, ${hexesInvaded.length} invasions (AC: ${acResult.verdict})`,
        occurredAt: new Date(), schemaVersion: SCHEMA_VERSION,
      });
    } catch (err) {
      console.warn('[CreditLedger] failed to create entry:', err.message);
    }

    // Finalise run document
    const boundingBox = RunService._calcBoundingBox(points);
    
    // Calculate steps: prioritize accelerometer-detected, fallback to GPS distance
    // Frontend sends accelSteps if available; backend calculates as 1312 steps per km
    const accelSteps = clientMeta?.accelSteps || 0;
    const stepsFromDistance = Math.round(distanceKm * 1312);
    const stepsCount = accelSteps > 0 ? accelSteps : stepsFromDistance;

    const updatedRun = await Run.findByIdAndUpdate(runId, {
      $set: {
        endedAt: new Date(), isActive: false,
        durationSeconds, distanceKm, stepsCount,
        hexesClaimed, hexesInvaded, hexesRetouched,
        hexesTotal: touchedHexIds.length,
        creditsEarned: finalCreditsTotal,
        creditsFromClaims: rawCredits.fromClaims,
        creditsFromInvasions: rawCredits.fromInvasions,
        peakMultiplierUsed: rawCredits.multiplier,
        endLocation: { type: 'Point', coordinates: [lng, lat] },
        boundingBox, isProcessed: true, processedAt: new Date(),
        antiCheat: {
          verdict: acResult.verdict,
          creditMultiplier: acResult.creditMultiplier,
          totalWeight: acResult.score.totalWeight,
          flagCount: acResult.score.flags.length,
          checkedAt: new Date()
        },
        validHexes: acResult.validHexes,
        failedHexes: acResult.failedHexes
      }
    }, { new: true });

    // Streak, achievements, leaderboard
    try {
      await UserService.updateStreak(userId);
    } catch (err) {
      console.warn('[Streak] update failed:', err.message);
    }
    
    try {
      await AchievementService.checkAll(userId, userAfter);
    } catch (err) {
      console.warn('[Achievements] check failed:', err.message);
    }
    
    try {
      await UserService.checkPrestige(userId);
    } catch (err) {
      console.warn('[Prestige] check failed:', err.message);
    }

    try {
      await LeaderboardService.buildGlobal();
      if (run.city) {
        await LeaderboardService.buildCity(run.city);
      }
    } catch (err) {
      console.warn('[Leaderboard] refresh after run failed:', err.message);
    }

    return {
      run: updatedRun,
      territoryChanges,
      antiCheat: {
        verdict: acResult.verdict,
        creditMultiplier: acResult.creditMultiplier,
      },
      user: {
        id: userAfter._id,
        credits: userAfter.credits,
        hexesOwned: userAfter.hexesOwned,
        globalRank: userAfter.globalRank,
        cityRank: userAfter.cityRank,
      },
      summary: {
        hexesClaimed: hexesClaimed.length,
        hexesInvaded: hexesInvaded.length,
        hexesRetouched: hexesRetouched.length,
        creditsEarned: finalCreditsTotal,
        distanceKm,
        durationSeconds,
        stepsCount,
        enclosureHexes: enclosedHexes.length,
        enclosureBonus,
      }
    };
  },

  _detectEnclosedHexes(points) {
    if (!Array.isArray(points) || points.length < ENCLOSURE_MIN_POINTS) return [];

    const first = points[0]?.location?.coordinates;
    const last = points[points.length - 1]?.location?.coordinates;
    if (!first || !last) return [];

    const startLat = first[1];
    const startLng = first[0];
    const endLat = last[1];
    const endLng = last[0];

    const closingDistanceM = h3.greatCircleDistance([startLat, startLng], [endLat, endLng], 'm');
    if (closingDistanceM > ENCLOSURE_CLOSE_DISTANCE_M) return [];

    const ring = points
      .map((point) => point?.location?.coordinates)
      .filter((coord) => Array.isArray(coord) && Number.isFinite(coord[0]) && Number.isFinite(coord[1]))
      .map((coord) => [coord[1], coord[0]]);

    if (ring.length < ENCLOSURE_MIN_POINTS) return [];

    const [firstLat, firstLng] = ring[0];
    const [lastLat, lastLng] = ring[ring.length - 1];
    if (firstLat !== lastLat || firstLng !== lastLng) {
      ring.push([firstLat, firstLng]);
    }

    try {
      const enclosed = h3.polygonToCells([ring], H3_RES);
      return Array.isArray(enclosed) ? enclosed : [];
    } catch (_) {
      return [];
    }
  },

  _calcDistanceKm(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const [lng1, lat1] = points[i - 1].location.coordinates;
      const [lng2, lat2] = points[i].location.coordinates;
      total += h3.greatCircleDistance([lat1, lng1], [lat2, lng2], 'km');
    }
    return Math.round(total * 100) / 100;
  },

  _calcBoundingBox(points) {
    if (!points.length) return null;
    const lats = points.map(p => p.location.coordinates[1]);
    const lngs = points.map(p => p.location.coordinates[0]);
    return {
      minLat: Math.min(...lats), maxLat: Math.max(...lats),
      minLng: Math.min(...lngs), maxLng: Math.max(...lngs),
    };
  },

  async _updateRivalry(userId, otherUserId) {
    // Increment clash count on both sides; mark as 'named' after 3+ clashes
    for (const [uid, oid] of [[userId, otherUserId], [otherUserId, userId]]) {
      const user = await User.findOneAndUpdate(
        { _id: uid, 'rivals.userId': oid },
        { $inc: { 'rivals.$.clashCount': 1 }, $set: { 'rivals.$.lastClashAt': new Date() } },
        { new: true }
      );
      if (!user) {
        // First clash — create entry
        await User.findByIdAndUpdate(uid, {
          $push: { rivals: { userId: oid, clashCount: 1, lastClashAt: new Date(), named: false } }
        });
      } else {
        const rival = user.rivals.find(r => r.userId.toString() === oid.toString());
        if (rival && rival.clashCount >= 3 && !rival.named) {
          await User.findOneAndUpdate(
            { _id: uid, 'rivals.userId': oid },
            { $set: { 'rivals.$.named': true } }
          );
        }
      }
    }
  },
};


// ═══════════════════════════════════════════════════════════════════════
// MAP SERVICE
// ═══════════════════════════════════════════════════════════════════════

const MapService = {

  /** Get all territory hexes within a bounding box for map rendering */
  async getTerritoriesInBbox({ minLat, minLng, maxLat, maxLng }) {
    const hexIds = H3Service.hexesInBoundingBox(minLat, minLng, maxLat, maxLng);
    const territories = await Territory.find({ hexId: { $in: hexIds } })
      .select('hexId ownerId ownerUsername ownerColor ownerHashcode claimedAt isContested isHotspot city');
    return territories;
  },

  /** Get territory stats for a specific user (for profile heatmap) */
  async getUserTerritoryMap(userId) {
    return Territory.find({ ownerId: userId })
      .select('hexId claimedAt totalInvasions creditValue decayFactor city lastActiveAt')
      .sort('claimedAt');
  },

  /** Get recently contested hexes (powers InvasionFeed) */
  async getRecentInvasions(limit = 20, city = null) {
    const query = city ? { hexCity: city } : {};
    return Invasion.find(query)
      .sort({ occurredAt: -1 })
      .limit(limit)
      .select('invaderUsername invaderColor victimUsername victimColor hexCount hexCity creditsGained occurredAt');
  },

  /** Get all territories owned by a specific city's top player */
  async getCityDominance(city) {
    const agg = await Territory.aggregate([
      { $match: { city } },
      { $group: { _id: '$ownerId', username: { $first: '$ownerUsername' }, color: { $first: '$ownerColor' }, hexCount: { $sum: 1 } } },
      { $sort: { hexCount: -1 } },
      { $limit: 10 },
    ]);
    return agg;
  },
};


// ═══════════════════════════════════════════════════════════════════════
// LEADERBOARD SERVICE
// ═══════════════════════════════════════════════════════════════════════

const LeaderboardService = {
  /** Get global aggregate stats for landing page */
  async getGlobalStats() {
    const totalUsers = await User.countDocuments({ isBanned: false });
    const totalHexes = await Territory.countDocuments({});

    // Summing credits is heavier, use aggregation
    const creditsAgg = await User.aggregate([
      { $match: { isBanned: false } },
      { $group: { _id: null, total: { $sum: '$credits' } } }
    ]);
    const totalCredits = creditsAgg[0]?.total || 0;

    // Count active runs in last 24h
    const activeSorties = await Run.countDocuments({ startedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });

    return {
      totalUsers,
      totalHexes,
      totalCredits,
      activeSorties,
    };
  },

  /** Build and cache global leaderboard (top 100) */
  async buildGlobal() {
    const users = await User.find({ isBanned: false })
      .sort({ credits: -1 })
      .limit(100)
      .select('username hashcode color credits hexesOwned stats isPrestige city');

    const entries = users.map((u, i) => ({
      rank: i + 1,
      userId: u._id,
      username: u.username,
      color: u.color,
      hashcode: u.hashcode,
      credits: u.credits,
      hexesOwned: u.hexesOwned,
      totalKm: u.stats?.totalKm || 0,
      currentStreak: u.stats?.currentStreak || 0,
      isPrestige: u.isPrestige,
    }));

    // Update globalRank on users
    for (const entry of entries) {
      await User.findByIdAndUpdate(entry.userId, { $set: { globalRank: entry.rank } });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    await LeaderboardCache.findOneAndUpdate(
      { scope: 'global', city: null, period: null },
      { $set: { scope: 'global', entries, totalUsers: entries.length, computedAt: new Date(), expiresAt } },
      { upsert: true }
    );

    return entries;
  },

  /** Build 24-hour leaderboard (resets daily) */
  async build24HourGlobal() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Get top runners from last 24 hours
    const runs = await Run.find({
      endedAt: { $gte: twentyFourHoursAgo },
      isActive: false,
    }).select('userId creditsEarned hexesTotal');

    // Aggregate credits and hexes per user in last 24h
    const userStats = {};
    runs.forEach(run => {
      if (!userStats[run.userId]) {
        userStats[run.userId] = { credits: 0, hexes: 0, runCount: 0 };
      }
      userStats[run.userId].credits += run.creditsEarned || 0;
      userStats[run.userId].hexes += run.hexesTotal || 0;
      userStats[run.userId].runCount += 1;
    });

    // Sort by credits earned in last 24h
    const sortedUsers = Object.entries(userStats)
      .sort((a, b) => b[1].credits - a[1].credits)
      .slice(0, 100);

    // Fetch user details and build entries
    const entries = await Promise.all(sortedUsers.map(async (entry, i) => {
      const user = await User.findById(entry[0]).select('username color hashcode');
      return {
        rank: i + 1,
        userId: entry[0],
        username: user?.username || 'Unknown',
        color: user?.color || '#A8D5BA',
        hashcode: user?.hashcode,
        credits24h: entry[1].credits,
        hexes24h: entry[1].hexes,
        runs24h: entry[1].runCount,
      };
    }));

    // Calculate rotation info - when next reset happens
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setHours(nextReset.getHours() + 1);
    nextReset.setMinutes(0, 0, 0); // Next full hour

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Cache 5 mins
    await LeaderboardCache.findOneAndUpdate(
      { scope: '24hour', city: null, period: null },
      { $set: { scope: '24hour', entries, totalUsers: entries.length, computedAt: new Date(), expiresAt, nextReset } },
      { upsert: true }
    );

    return entries;
  },

  /** Build city leaderboard */
  async buildCity(city) {
    const users = await User.find({ city, isBanned: false })
      .sort({ credits: -1 })
      .limit(50)
      .select('username hashcode color credits hexesOwned stats isPrestige');

    const entries = users.map((u, i) => ({
      rank: i + 1, userId: u._id, username: u.username,
      color: u.color, hashcode: u.hashcode,
      credits: u.credits, hexesOwned: u.hexesOwned,
      totalKm: u.stats?.totalKm || 0, isPrestige: u.isPrestige,
    }));

    // Update cityRank
    for (const entry of entries) {
      await User.findByIdAndUpdate(entry.userId, { $set: { cityRank: entry.rank } });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await LeaderboardCache.findOneAndUpdate(
      { scope: 'city', city, period: null },
      { $set: { scope: 'city', city, entries, totalUsers: entries.length, computedAt: new Date(), expiresAt } },
      { upsert: true }
    );

    return entries;
  },

  /** Build 24-hour city leaderboard (resets daily per city) */
  async build24HourCity(city) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Get top runners from this city in last 24 hours
    const runs = await Run.find({
      city,
      endedAt: { $gte: twentyFourHoursAgo },
      isActive: false,
    }).select('userId creditsEarned hexesTotal');

    // Aggregate credits and hexes per user in last 24h
    const userStats = {};
    runs.forEach(run => {
      if (!userStats[run.userId]) {
        userStats[run.userId] = { credits: 0, hexes: 0, runCount: 0 };
      }
      userStats[run.userId].credits += run.creditsEarned || 0;
      userStats[run.userId].hexes += run.hexesTotal || 0;
      userStats[run.userId].runCount += 1;
    });

    // Sort by credits earned in last 24h
    const sortedUsers = Object.entries(userStats)
      .sort((a, b) => b[1].credits - a[1].credits)
      .slice(0, 50);

    // Fetch user details and build entries
    const entries = await Promise.all(sortedUsers.map(async (entry, i) => {
      const user = await User.findById(entry[0]).select('username color hashcode');
      return {
        rank: i + 1,
        userId: entry[0],
        username: user?.username || 'Unknown',
        color: user?.color || '#A8D5BA',
        hashcode: user?.hashcode,
        credits24h: entry[1].credits,
        hexes24h: entry[1].hexes,
        runs24h: entry[1].runCount,
      };
    }));

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Cache 5 mins
    await LeaderboardCache.findOneAndUpdate(
      { scope: '24hour', city, period: null },
      { $set: { scope: '24hour', city, entries, totalUsers: entries.length, computedAt: new Date(), expiresAt } },
      { upsert: true }
    );

    return entries;
  },

  /** Get leaderboard from cache (rebuild if stale) */
  async get(scope, city = null) {
    const cached = await LeaderboardCache.findOne({ scope, city: city || null });
    if (cached && cached.expiresAt > new Date()) return cached.entries;
    if (scope === 'global') return LeaderboardService.buildGlobal();
    if (scope === 'city' && city) return LeaderboardService.buildCity(city);
    throw new Error('Invalid leaderboard scope');
  },

  /** Get top N commanders for landing page podium */
  async getTopCommanders(limit = 3) {
    const users = await User.find({ isBanned: false })
      .sort({ credits: -1 })
      .limit(limit)
      .select('username hashcode color credits hexesOwned city stats.currentStreak isPrestige');

    return users.map((u, i) => ({
      rank: i + 1,
      userId: u._id,
      username: u.username,
      color: u.color,
      hashcode: u.hashcode,
      credits: u.credits,
      hexesOwned: u.hexesOwned,
      city: u.city,
      currentStreak: u.stats?.currentStreak || 0,
      isPrestige: u.isPrestige,
    }));
  },

  /** Get city activity rankings (hexes captured from recent runs) */
  async getCityActivity() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const cityStats = await Run.aggregate([
      {
        $match: {
          endedAt: { $gte: oneHourAgo },
          isActive: false,
          city: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$city',
          hexesCaptured: { $sum: '$hexesTotal' },
          runCount: { $sum: 1 },
          totalCredits: { $sum: '$creditsEarned' }
        }
      },
      { $sort: { hexesCaptured: -1 } },
      { $limit: 10 }
    ]);

    return cityStats.map(c => ({
      city: c._id,
      hexesCaptured: c.hexesCaptured,
      runCount: c.runCount,
      totalCredits: c.totalCredits,
    }));
  },

  /** Get recent achievements and high-performing runs for wins feed */
  async getRecentWins(limit = 5) {
    const wins = [];

    // Get recent achievements
    const achievements = await UserAchievement.find({
      earnedAt: { $exists: true }
    })
      .sort({ earnedAt: -1 })
      .limit(Math.ceil(limit / 2))
      .populate('userId', 'username color')
      .populate('achievementId', 'name description tier');

    achievements.forEach(a => {
      if (a.userId && a.achievementId) {
        wins.push({
          type: 'achievement',
          username: a.userId.username,
          color: a.userId.color,
          achievement: a.achievementId.name,
          tier: a.achievementId.tier,
          timestamp: a.earnedAt,
        });
      }
    });

    // Get high-performing recent runs
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const impressiveRuns = await Run.find({
      endedAt: { $gte: oneHourAgo },
      isActive: false,
      $or: [
        { hexesTotal: { $gte: 30 } },
        { creditsEarned: { $gte: 500 } },
      ]
    })
      .sort({ creditsEarned: -1 })
      .limit(Math.floor(limit / 2))
      .select('userId username creditsEarned hexesTotal hexesInvaded endedAt');

    impressiveRuns.forEach(r => {
      wins.push({
        type: 'run',
        username: r.username,
        creditsEarned: r.creditsEarned,
        hexesCaptured: r.hexesTotal,
        hexesInvaded: r.hexesInvaded?.length || 0,
        timestamp: r.endedAt,
      });
    });

    // Sort by timestamp and limit
    return wins.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  },

  /** Enhanced global stats with more real-time data */
  async getEnhancedStats() {
    const redis = getRedis();
    const cacheKey = 'landing:enhanced_stats';
    
    // Try cache first (2 min TTL)
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) { /* cache miss, continue */ }

    try {
      // Time-based stats
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Run all queries in parallel with 5-second timeout per query
      const timeoutMs = 5000;
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

      const [
        totalUsers,
        totalHexes,
        creditsAgg,
        activeSorties,
        distanceToday,
        distanceWeek,
        invasionsToday,
        weeklyGrowth,
      ] = await Promise.allSettled([
        User.countDocuments({ isBanned: false }),
        Territory.countDocuments({}),
        User.aggregate([
          { $match: { isBanned: false } },
          { $group: { _id: null, total: { $sum: '$credits' } } }
        ]),
        Run.countDocuments({ startedAt: { $gte: oneDayAgo }, isActive: false }),
        Run.aggregate([
          { $match: { endedAt: { $gte: today }, isActive: false } },
          { $limit: 10000 },
          { $group: { _id: null, total: { $sum: '$distanceKm' } } }
        ]),
        Run.aggregate([
          { $match: { endedAt: { $gte: oneWeekAgo }, isActive: false } },
          { $limit: 50000 },
          { $group: { _id: null, total: { $sum: '$distanceKm' } } }
        ]),
        Run.aggregate([
          { $match: { endedAt: { $gte: today }, isActive: false } },
          { $limit: 10000 },
          { $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$hexesInvaded', []] } } } } }
        ]),
        User.countDocuments({ createdAt: { $gte: oneWeekAgo }, isBanned: false }),
      ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

      clearTimeout(timeoutId);

      // Extract values with fallbacks
      const totalUsersVal = totalUsers || 1;
      const totalHexesVal = totalHexes || 0;
      const totalCreditsVal = creditsAgg?.[0]?.total || 0;
      const activeSortiesVal = activeSorties || 0;
      const distanceTodayVal = Math.round((distanceToday?.[0]?.total || 0) * 10) / 10;
      const distanceWeekVal = Math.round((distanceWeek?.[0]?.total || 0) * 10) / 10;
      const invasionsTodayVal = invasionsToday?.[0]?.total || 0;
      const weeklyGrowthVal = weeklyGrowth || 0;

      // Online count from Redis (non-blocking)
      let onlineCount = 0;
      try {
        const onlineRaw = await redis.smembers('online_users');
        onlineCount = new Set(onlineRaw.map(r => {
          try { return JSON.parse(r).userId; } catch { return null; }
        }).filter(Boolean)).size;
      } catch (e) { /* redis error, use 0 */ }

      const stats = {
        totalUsers: totalUsersVal,
        totalHexes: totalHexesVal,
        totalCredits: totalCreditsVal,
        activeSorties: activeSortiesVal,
        onlineCount,
        distanceToday: distanceTodayVal,
        distanceWeek: distanceWeekVal,
        territoriesInvadedToday: invasionsTodayVal,
        weeklyGrowth: weeklyGrowthVal,
      };

      // Cache for 2 minutes
      try {
        await redis.setex(cacheKey, 120, JSON.stringify(stats));
      } catch (e) { /* cache write failure, non-critical */ }

      return stats;
    } catch (err) {
      console.error('getEnhancedStats error:', err.message);
      // Return fallback values on error
      return {
        totalUsers: 1,
        totalHexes: 0,
        totalCredits: 0,
        activeSorties: 0,
        onlineCount: 0,
        distanceToday: 0,
        distanceWeek: 0,
        territoriesInvadedToday: 0,
        weeklyGrowth: 0,
      };
    }
  },
};


// ═══════════════════════════════════════════════════════════════════════
// NOTIFICATION SERVICE
// ═══════════════════════════════════════════════════════════════════════

const NotificationService = {

  /** Create an invasion alert notification for the victim */
  async createInvasionAlert({ victimId, invaderUsername, hexCount, creditsLost, city, invasionId }) {
    const victim = await User.findById(victimId).select('notifications timezone');
    if (!victim?.notifications?.invasionAlerts) return;

    await Notification.create({
      userId: victimId,
      type: 'invasion_alert',
      title: '⚠ Territory invaded!',
      body: `${invaderUsername} just took ${hexCount} hex${hexCount > 1 ? 'es' : ''} in ${city || 'your territory'}`,
      actionType: 'open_map',
      actionData: { invasionId },
      triggeredBy: null,
      creditDelta: -creditsLost,
      hexCount,
      schemaVersion: SCHEMA_VERSION,
    });
  },

  /** Create rank change notification */
  async createRankChange({ userId, rankBefore, rankAfter }) {
    const user = await User.findById(userId).select('notifications');
    if (!user?.notifications?.rankChanges) return;

    const delta = rankAfter - rankBefore;
    const isUp = delta < 0;

    await Notification.create({
      userId,
      type: isUp ? 'rank_up' : 'rank_drop',
      title: isUp ? '📈 Rank up!' : '📉 Rank dropped',
      body: `You moved from #${rankBefore} to #${rankAfter}`,
      actionType: 'open_leaderboard',
      actionData: { leaderboardScope: 'global' },
      rankBefore, rankAfter,
      schemaVersion: SCHEMA_VERSION,
    });
  },

  /** Create streak reminder (called by daily cron for at-risk users) */
  async createStreakReminder(userId, currentStreak) {
    await Notification.create({
      userId,
      type: 'streak_reminder',
      title: `🔥 Keep your streak alive!`,
      body: `You've run ${currentStreak} days in a row. Don't break it today.`,
      actionType: 'open_dashboard',
      schemaVersion: SCHEMA_VERSION,
    });
  },

  /** Get unread notifications for a user */
  async getUnread(userId, limit = 30) {
    return Notification.find({ userId, isRead: false })
      .sort({ createdAt: -1 })
      .limit(limit);
  },

  /** Mark notifications as read */
  async markRead(userId, notificationIds) {
    await Notification.updateMany(
      { _id: { $in: notificationIds }, userId },
      { $set: { isRead: true } }
    );
  },
};


// ═══════════════════════════════════════════════════════════════════════
// ACHIEVEMENT SERVICE
// ═══════════════════════════════════════════════════════════════════════

const AchievementService = {

  /** Check all achievement conditions for a user after a run */
  async checkAll(userId, user) {
    const defs = await AchievementDef.find({});
    const earned = await UserAchievement.find({ userId }).select('achievementSlug');
    const earnedSlugs = new Set(earned.map(e => e.achievementSlug));

    const stats = user.stats || {};
    const metricMap = {
      totalRuns: stats.totalRuns || 0,
      totalHexesClaimed: stats.totalHexesClaimed || 0,
      totalHexesInvaded: stats.totalHexesInvaded || 0,
      currentStreak: stats.currentStreak || 0,
      totalKm: stats.totalKm || 0,
      cityRank: user.cityRank || 999,
      rivals: (user.rivals || []).filter(r => r.named).length,
    };

    for (const def of defs) {
      if (earnedSlugs.has(def.slug) && !def.isRepeatable) continue;
      const val = metricMap[def.condition.metric];
      if (val === undefined) continue;

      let met = false;
      if (def.condition.operator === 'gte') met = val >= def.condition.value;
      if (def.condition.operator === 'lte') met = val <= def.condition.value;
      if (def.condition.operator === 'eq') met = val === def.condition.value;

      if (met) {
        await UserAchievement.create({
          userId, achievementSlug: def.slug, achievementName: def.name,
          tier: def.tier, creditReward: def.creditReward, earnedAt: new Date(),
        });

        if (def.creditReward > 0) {
          const updatedUser = await User.findByIdAndUpdate(userId, {
            $inc: { credits: def.creditReward }
          }, { new: true });
          await CreditLedger.create({
            userId, amount: def.creditReward,
            balanceAfter: updatedUser.credits,
            type: 'achievement',
            note: `Achievement: ${def.name}`,
            occurredAt: new Date(), schemaVersion: SCHEMA_VERSION,
          });
        }

        await Notification.create({
          userId, type: 'achievement_unlocked',
          title: `🏆 Achievement unlocked!`,
          body: `${def.icon} ${def.name} — ${def.description}`,
          actionType: 'open_profile',
          creditDelta: def.creditReward || 0,
          schemaVersion: SCHEMA_VERSION,
        });
      }
    }
  },
};


// ═══════════════════════════════════════════════════════════════════════
// CHAT SERVICE
// ═══════════════════════════════════════════════════════════════════════

const ChatService = {

  /** Send a message to a room */
  async sendMessage({ roomId, senderId, content, contentType = 'text', replyToId = null }) {
    const sender = await User.findById(senderId).select('username color hashcode isBanned');
    if (sender.isBanned) throw new Error('Banned users cannot send messages');

    const room = await ChatRoom.findById(roomId);
    if (!room) throw new Error('Chat room not found');

    const message = await ChatMessage.create({
      roomId, roomType: room.type,
      senderId, senderUsername: sender.username,
      senderColor: sender.color, senderHashcode: sender.hashcode,
      content: content.trim(), contentType, replyToId,
      sentAt: new Date(), schemaVersion: SCHEMA_VERSION,
    });

    await ChatRoom.findByIdAndUpdate(roomId, {
      $inc: { messageCount: 1 },
      $set: { lastMessageAt: new Date() },
    });

    return message;
  },

  /** Get or create a DM room between two users */
  async getOrCreateDmRoom(userId1, userId2) {
    const members = [userId1, userId2].sort();
    let room = await ChatRoom.findOne({ isDm: true, members: { $all: members, $size: 2 } });
    if (!room) {
      room = await ChatRoom.create({ type: 'dm', isDm: true, members });
    }
    return room;
  },

  /** Get recent messages for a room */
  async getMessages(roomId, limit = 50, before = null) {
    const query = { roomId, isDeleted: false };
    if (before) query.sentAt = { $lt: new Date(before) };
    return ChatMessage.find(query).sort({ sentAt: -1 }).limit(limit);
  },

  /** Flag a message */
  async flagMessage(messageId, flaggerId) {
    const message = await ChatMessage.findByIdAndUpdate(
      messageId,
      { $addToSet: { flaggedBy: flaggerId }, $inc: { flagCount: 1 } },
      { new: true }
    );
    if (message.flagCount >= 3) {
      await ChatMessage.findByIdAndUpdate(messageId, { $set: { isHidden: true } });
    }
    return message;
  },
};


// ═══════════════════════════════════════════════════════════════════════
// BLOCKCHAIN SERVICE
// ═══════════════════════════════════════════════════════════════════════

const BlockchainService = {

  /** Build daily Merkle root from all user summaries */
  async buildDailyProof(dateStr) {
    const users = await User.find({ isBanned: false }).select('username credits hexesOwned stats');

    // Build leaf hashes
    const leaves = users.map(u => {
      // Align with test expectations: userId:credits:hexes:km:date
      const km = Math.round((u.stats.totalKm || 0) * 100);
      const leaf = `${u._id.toString()}:${u.credits}:${u.hexesOwned}:${km}:${dateStr}`;
      return crypto.createHash('sha256').update(leaf).digest('hex');
    });

    // Simple Merkle root (for production use a proper Merkle tree library)
    const merkleRoot = BlockchainService._merkleRoot(leaves);

    const today = await Run.find({
      startedAt: { $gte: new Date(dateStr), $lt: new Date(new Date(dateStr).getTime() + 86400000) },
      isProcessed: true,
    });

    const totalKm = today.reduce((s, r) => s + (r.distanceKm || 0), 0);
    const topUser = users.sort((a, b) => b.credits - a.credits)[0];

    const proof = await DailyProof.findOneAndUpdate(
      { date: dateStr },
      {
        $set: {
          date: dateStr,
          city: userAfter.city,
          totalUsers: users.length,
          activeUsers: today.length,
          totalRunsCompleted: today.length,
          totalKmRun: Math.round(totalKm * 10) / 10,
          stats: userAfter.stats,
          totalHexesClaimed: await Territory.countDocuments(),
          topUserId: crypto.createHash('sha256').update(topUser._id.toString()).digest('hex'),
          topUserCredits: topUser.credits,
          merkleRoot, leafCount: leaves.length,
          status: 'anchoring', anchorAttempts: 1,
          schemaVersion: SCHEMA_VERSION,
        }
      },
      { upsert: true, new: true }
    );

    return proof;
  },

  /** Confirm an anchored transaction */
  async confirmAnchor(dateStr, txSignature, blockHeight) {
    await DailyProof.findOneAndUpdate(
      { date: dateStr },
      { $set: { txSignature, blockHeight, anchoredAt: new Date(), status: 'confirmed', network: 'mainnet-beta' } }
    );
  },

  _merkleRoot(leaves) {
    if (!leaves.length) return null;
    let level = leaves;
    while (level.length > 1) {
      const next = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left;
        next.push(crypto.createHash('sha256').update(left + right).digest('hex'));
      }
      level = next;
    }
    return level[0];
  },
};


// ═══════════════════════════════════════════════════════════════════════
// CITY STATS SERVICE
// ═══════════════════════════════════════════════════════════════════════

const CityStatsService = {

  /** Recompute stats for all active cities (called by hourly cron) */
  async recomputeAll() {
    const cities = await User.distinct('city', { city: { $ne: null } });
    for (const city of cities) {
      await CityStatsService.recompute(city);
    }
  },

  async recompute(city) {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [players, hexes, runsToday, invasionsToday, topPlayers] = await Promise.all([
      User.countDocuments({ city, isBanned: false }),
      Territory.countDocuments({ city }),
      Run.countDocuments({ city, startedAt: { $gte: today } }),
      Invasion.countDocuments({ hexCity: city, occurredAt: { $gte: today } }),
      User.find({ city, isBanned: false }).sort({ credits: -1 }).limit(3)
        .select('username color credits hexesOwned'),
    ]);

    const dominance = await MapService.getCityDominance(city);
    const dominant = dominance[0] || {};

    await CityStats.findOneAndUpdate(
      { city },
      {
        $set: {
          city, totalPlayers: players,
          totalHexesClaimed: hexes,
          runsToday, invasionsToday,
          topPlayers: topPlayers.map(u => ({
            userId: u._id, username: u.username, color: u.color,
            credits: u.credits, hexes: u.hexesOwned,
          })),
          dominantUser: dominant.username || null,
          dominantColor: dominant.color || null,
          computedAt: new Date(), schemaVersion: SCHEMA_VERSION,
        }
      },
      { upsert: true }
    );
  },
};


// ═══════════════════════════════════════════════════════════════════════
// CRON JOBS
// ═══════════════════════════════════════════════════════════════════════

const CronJobs = {

  /** Every 5 minutes — refresh global + active city leaderboards */
  async refreshLeaderboards() {
    await LeaderboardService.buildGlobal();
    const cities = await User.distinct('city', { city: { $ne: null } });
    for (const city of cities) {
      await LeaderboardService.buildCity(city);
    }
    console.log('Leaderboards refreshed');
  },

  /** Daily at midnight UTC — decay + blockchain proof + city stats */
  async dailyMidnight() {
    const dateStr = new Date().toISOString().split('T')[0];
    await CreditEngine.applyGlobalDecay();
    await BlockchainService.buildDailyProof(dateStr);
    await CityStatsService.recomputeAll();
    console.log(`Daily cron complete for ${dateStr}`);
  },

  /** Daily at 8pm — streak reminders for users with no run today */
  async streakReminders() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const usersWhoRanToday = await Run.distinct('userId', { startedAt: { $gte: today } });
    const atRisk = await User.find({
      _id: { $nin: usersWhoRanToday },
      'stats.currentStreak': { $gte: 2 }, // only remind users with active streaks
      'notifications.streakReminders': true,
      isBanned: false,
    }).select('_id stats.currentStreak');

    for (const user of atRisk) {
      await NotificationService.createStreakReminder(user._id, user.stats.currentStreak);
    }
    console.log(`Streak reminders: notified ${atRisk.length} users`);
  },
};


// ═══════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════

module.exports = {
  UserService,
  H3Service,
  CreditEngine,
  RunService,
  MapService,
  LeaderboardService,
  NotificationService,
  AchievementService,
  ChatService,
  BlockchainService,
  CityStatsService,
  CronJobs,
};
