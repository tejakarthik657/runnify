// run-service/anticheat.engine.js
// ============================================================
// TERRITORY RUN — ANTI-CHEAT ENGINE (6 Detection Layers)
// ============================================================
// PHILOSOPHY: Make cheating hard, detectable, and unrewarding.
// Never instant-ban. Silent penalties hurt cheaters more.
// Real runners should NEVER feel this running.
//
// LAYERS:
//   1. Speed + acceleration filter   (kills cars/bikes instantly)
//   2. Path smoothness analysis       (catches GPS spoofers)
//   3. Impossible pace check          (sanity on overall run)
//   4. Hex dwell time filter          (kills drive-by claiming)
//   5. Mock location + altitude check (Android spoofing apps)
//   6. Account farming detection      (multi-account reclaim)
// ============================================================

// ─────────────────────────────────────────────────────────────
// TUNING CONSTANTS — all in one place for easy adjustment
// ─────────────────────────────────────────────────────────────
const LIMITS = {
  // Layer 1 — Speed
  SPEED_HARD_MAX_MS:      7.5,   // 27 km/h — absolute ceiling (world record sprint)
  SPEED_SUSTAINED_MS:     5.5,   // 19.8 km/h — sustained running ceiling
  SPEED_SUSTAINED_COUNT:  5,     // consecutive violations before flagging
  SPEED_BIKE_THRESHOLD:   4.5,   // 16.2 km/h — used for context only

  // Layer 2 — Smoothness
  BEARING_VAR_MIN:        0.8,   // degrees — below = too straight (car)
  BEARING_VAR_MAX:       175.0,  // degrees — above = chaotic (shaking)
  SPEED_CV_MIN:           0.08,  // coefficient of variation — below = too robotic
  STRAIGHT_RATIO_MAX:     0.97,  // path/displacement ratio — above = car on highway

  // Layer 3 — Pace
  PACE_MIN_MIN_PER_KM:    2.5,   // sub-2:30/km pace over >0.5km = impossible
  PACE_MIN_DISTANCE_KM:   0.5,   // only check pace if run is at least this long

  // Layer 4 — Dwell time
  DWELL_MIN_SECONDS:      8,     // must be inside a hex ≥8s to claim it
  DWELL_FAIL_RATE_FLAG:   0.55,  // flag run if >55% of hexes fail dwell
  DWELL_MIN_HEX_SAMPLE:   4,     // need at least N hexes to apply dwell-rate flag

  // Layer 5 — Location integrity
  ALT_JUMP_MAX_METERS:   100,    // >100m altitude between consecutive points = teleport
  LOW_PRECISION_RATIO:    0.5,   // flag if >50% coords have ≤2 decimal places

  // Layer 6 — Account farming
  IP_ACCOUNTS_MAX:          3,   // max accounts from same IP in 24h
  RECLAIM_WINDOW_MINUTES:  10,   // same IP reclaiming hex within N min = farming
};

// Flag weights — higher = worse. These stack up to a total score.
const WEIGHT = {
  speed_hard_violation:      100,   // instant disqualify territory
  speed_sustained_violation:  60,
  straight_line_car:          70,
  path_too_smooth:            40,
  path_chaotic_shaking:       35,
  impossible_pace:            80,
  dwell_rate_fail:            50,
  mock_location:              90,
  altitude_teleport:          65,
  low_coord_precision:        40,
  account_farming_ip:         85,
  account_farming_reclaim:    95,
};

// Verdict thresholds
const THRESHOLD = {
  CLEAN:       0,    //   0–39  → full credits, no message
  WARN:       40,    //  40–79  → 75% credits, soft warning
  PARTIAL:    80,    //  80–149 → 50% credits, clear warning
  DISQUALIFY: 150,   //  150+   → 0% credits, run flagged
};

// ─────────────────────────────────────────────────────────────
// GEOMETRY HELPERS
// ─────────────────────────────────────────────────────────────
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y    = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x    = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180)
    - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

// Angular difference between two bearings (handles 359° → 1° wrap)
function bearingDiff(b1, b2) {
  const diff = Math.abs(b1 - b2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function coefficientOfVariation(arr) {
  const m = mean(arr);
  return m === 0 ? 0 : stddev(arr) / m;
}

// ─────────────────────────────────────────────────────────────
// LAYER 1 — SPEED FILTER
// Hard ceiling: 27 km/h absolute, 19.8 km/h sustained
// Returns flags[] + per-segment speeds[] for later use
// ─────────────────────────────────────────────────────────────
function layer1_speed(points) {
  const flags  = [];
  const speeds = []; // m/s for each segment
  let sustainedAbove = 0;

  for (let i = 1; i < points.length; i++) {
    const prev  = points[i - 1];
    const curr  = points[i];
    const dtSec = (new Date(curr.ts) - new Date(prev.ts)) / 1000;
    if (dtSec <= 0) { speeds.push(0); continue; }

    const dist  = distanceMeters(prev.lat, prev.lng, curr.lat, curr.lng);
    const speed = dist / dtSec;
    speeds.push(speed);

    // Hard ceiling — single point violation is enough
    if (speed > LIMITS.SPEED_HARD_MAX_MS) {
      flags.push({
        type:   'speed_hard_violation',
        weight: WEIGHT.speed_hard_violation,
        detail: `${(speed * 3.6).toFixed(1)} km/h at segment ${i} — exceeds hard limit`,
        segmentIndex: i,
      });
    }

    // Sustained ceiling — must be N consecutive points
    if (speed > LIMITS.SPEED_SUSTAINED_MS) {
      sustainedAbove++;
      if (sustainedAbove >= LIMITS.SPEED_SUSTAINED_COUNT) {
        flags.push({
          type:   'speed_sustained_violation',
          weight: WEIGHT.speed_sustained_violation,
          detail: `${sustainedAbove} consecutive segments above ${(LIMITS.SPEED_SUSTAINED_MS * 3.6).toFixed(1)} km/h`,
        });
        sustainedAbove = 0; // reset to avoid re-flagging same streak
      }
    } else {
      sustainedAbove = 0;
    }
  }

  return { flags, speeds };
}

// ─────────────────────────────────────────────────────────────
// LAYER 2 — PATH SMOOTHNESS
// Cars: arrow-straight paths, robot-uniform speed
// Shakers: chaotic bearing changes, near-zero net displacement
// ─────────────────────────────────────────────────────────────
function layer2_smoothness(points, speeds) {
  const flags = [];
  if (points.length < 5) return { flags };

  // ── Bearing analysis ──────────────────────────────────────
  const bearings = [];
  const bearingDeltas = [];
  for (let i = 1; i < points.length; i++) {
    const b = bearingDeg(
      points[i - 1].lat, points[i - 1].lng,
      points[i].lat,     points[i].lng
    );
    bearings.push(b);
    if (i > 1) bearingDeltas.push(bearingDiff(bearings[i - 2], b));
  }

  const bearingVariance = stddev(bearingDeltas);

  // Path too straight — car on a road
  if (bearingVariance < LIMITS.BEARING_VAR_MIN && points.length > 10) {
    flags.push({
      type:   'straight_line_car',
      weight: WEIGHT.straight_line_car,
      detail: `Bearing variance ${bearingVariance.toFixed(2)}° — path suspiciously straight`,
    });
  }

  // Path too chaotic — phone shaking in place
  if (bearingVariance > LIMITS.BEARING_VAR_MAX) {
    flags.push({
      type:   'path_chaotic_shaking',
      weight: WEIGHT.path_chaotic_shaking,
      detail: `Bearing variance ${bearingVariance.toFixed(2)}° — chaotic / phone shaking`,
    });
  }

  // ── Speed uniformity — robots don't vary pace ─────────────
  const validSpeeds = speeds.filter(s => s > 0);
  if (validSpeeds.length > 5) {
    const speedCV = coefficientOfVariation(validSpeeds);
    if (speedCV < LIMITS.SPEED_CV_MIN) {
      flags.push({
        type:   'path_too_smooth',
        weight: WEIGHT.path_too_smooth,
        detail: `Speed CV ${speedCV.toFixed(3)} — movement suspiciously uniform`,
      });
    }
  }

  // ── Displacement ratio — car going A→B in a straight line ─
  const totalPath = points.reduce((sum, pt, i) => {
    if (i === 0) return sum;
    return sum + distanceMeters(points[i - 1].lat, points[i - 1].lng, pt.lat, pt.lng);
  }, 0);

  const crowFlies = distanceMeters(
    points[0].lat, points[0].lng,
    points[points.length - 1].lat, points[points.length - 1].lng
  );

  const straightRatio = totalPath > 0 ? crowFlies / totalPath : 0;
  if (straightRatio > LIMITS.STRAIGHT_RATIO_MAX && totalPath > 400) {
    flags.push({
      type:   'straight_line_car',
      weight: WEIGHT.straight_line_car,
      detail: `Displacement ratio ${straightRatio.toFixed(3)} — near-perfect straight line`,
    });
  }

  return { flags, bearingVariance, straightRatio };
}

// ─────────────────────────────────────────────────────────────
// LAYER 3 — IMPOSSIBLE PACE
// "5 km in 10 minutes" type sanity check on whole run
// ─────────────────────────────────────────────────────────────
function layer3_pace(points, totalDistanceKm) {
  const flags = [];
  if (points.length < 2 || totalDistanceKm < LIMITS.PACE_MIN_DISTANCE_KM) return { flags };

  const totalSec = (new Date(points[points.length - 1].ts) - new Date(points[0].ts)) / 1000;
  if (totalSec <= 0) return { flags };

  const paceMinPerKm = totalSec / 60 / totalDistanceKm;

  if (paceMinPerKm < LIMITS.PACE_MIN_MIN_PER_KM) {
    flags.push({
      type:   'impossible_pace',
      weight: WEIGHT.impossible_pace,
      detail: `Avg ${paceMinPerKm.toFixed(2)} min/km over ${totalDistanceKm.toFixed(2)} km — beyond human capability`,
    });
  }

  return { flags, paceMinPerKm };
}

// ─────────────────────────────────────────────────────────────
// LAYER 4 — HEX DWELL TIME
// User must spend ≥8 seconds inside a hex to claim it.
// Drive-by at 40 km/h: crosses a hex in ~1 second → filtered.
// Returns validHexes (passed dwell), failedHexes (drive-bys)
// ─────────────────────────────────────────────────────────────
function layer4_dwell(points) {
  const flags    = [];
  // Build per-hex timestamp lists
  const hexTimes = new Map();

  for (const pt of points) {
    if (!pt.hexId) continue;
    if (!hexTimes.has(pt.hexId)) hexTimes.set(pt.hexId, []);
    hexTimes.get(pt.hexId).push(new Date(pt.ts).getTime());
  }

  const validHexes  = [];
  const failedHexes = [];
  const dwellMap    = {};

  for (const [hexId, tsList] of hexTimes.entries()) {
    tsList.sort((a, b) => a - b);
    const dwellSec = tsList.length > 1
      ? (tsList[tsList.length - 1] - tsList[0]) / 1000
      : 0;

    dwellMap[hexId] = Math.round(dwellSec);

    if (dwellSec >= LIMITS.DWELL_MIN_SECONDS) {
      validHexes.push(hexId);
    } else {
      failedHexes.push(hexId);
    }
  }

  // If the majority of hexes fail dwell, flag the run
  const totalHexes = hexTimes.size;
  if (totalHexes >= LIMITS.DWELL_MIN_HEX_SAMPLE) {
    const failRate = failedHexes.length / totalHexes;
    if (failRate > LIMITS.DWELL_FAIL_RATE_FLAG) {
      flags.push({
        type:   'dwell_rate_fail',
        weight: WEIGHT.dwell_rate_fail,
        detail: `${(failRate * 100).toFixed(0)}% of hexes visited for <${LIMITS.DWELL_MIN_SECONDS}s (drive-by pattern)`,
      });
    }
  }

  return { flags, validHexes, failedHexes, dwellMap };
}

// ─────────────────────────────────────────────────────────────
// LAYER 5 — LOCATION INTEGRITY
// Android mock location flag + altitude teleport + coord precision
// ─────────────────────────────────────────────────────────────
function layer5_integrity(points, clientMeta = {}) {
  const flags = [];

  // Android mock location flag (client sends this if it detects it)
  if (clientMeta.isMockLocation === true) {
    flags.push({
      type:   'mock_location',
      weight: WEIGHT.mock_location,
      detail: 'Android mock location provider active during run',
    });
  }

  // Altitude teleport — real GPS can't jump >100m between consecutive points
  const altPoints = points.filter(p => p.altitude != null && !isNaN(p.altitude));
  for (let i = 1; i < altPoints.length; i++) {
    const jump = Math.abs(altPoints[i].altitude - altPoints[i - 1].altitude);
    if (jump > LIMITS.ALT_JUMP_MAX_METERS) {
      flags.push({
        type:   'altitude_teleport',
        weight: WEIGHT.altitude_teleport,
        detail: `Altitude jumped ${jump.toFixed(0)}m — GPS teleport signature`,
      });
      break; // one flag per run is enough
    }
  }

  // Low coordinate precision — spoofing apps round to 2-3 decimal places
  // Real GPS hardware always produces 5–7 decimal places
  if (points.length >= 10) {
    const lowPrecCount = points.filter(p => {
      const latDec = (String(p.lat).split('.')[1] || '').length;
      const lngDec = (String(p.lng).split('.')[1] || '').length;
      return latDec <= 3 || lngDec <= 3;
    }).length;

    const ratio = lowPrecCount / points.length;
    if (ratio > LIMITS.LOW_PRECISION_RATIO) {
      flags.push({
        type:   'low_coord_precision',
        weight: WEIGHT.low_coord_precision,
        detail: `${(ratio * 100).toFixed(0)}% of GPS coordinates have ≤3 decimal places (spoofing app signature)`,
      });
    }
  }

  return { flags };
}

// ─────────────────────────────────────────────────────────────
// LAYER 6 — ACCOUNT FARMING
// Same IP losing a hex then immediately reclaiming it via alt account
// Uses Redis sliding windows — no heavy DB queries
// ─────────────────────────────────────────────────────────────
async function layer6_farming(userId, hexesInvaded, requestIp) {
  const flags = [];
  if (!requestIp) return { flags };

  let redis;
  try {
    redis = require('../config/redis').getRedis();
  } catch {
    return { flags }; // Redis unavailable — skip farming check gracefully
  }

  // Track IP → userId over 24h
  const ipToUsersKey = `ac:ip:${requestIp}`;
  await redis.sAdd(ipToUsersKey, userId.toString());
  await redis.expire(ipToUsersKey, 86400);
  const accountsOnIp = await redis.sCard(ipToUsersKey);

  if (accountsOnIp > LIMITS.IP_ACCOUNTS_MAX) {
    flags.push({
      type:   'account_farming_ip',
      weight: WEIGHT.account_farming_ip,
      detail: `${accountsOnIp} different accounts active from same IP in 24h`,
    });
  }

  // Store this user's known IPs for cross-account checking
  const userIpKey = `ac:user_ips:${userId}`;
  await redis.sAdd(userIpKey, requestIp);
  await redis.expire(userIpKey, 86400);

  // Reclaim farming: check if any hex we're invading was recently lost
  // by a different account sharing the same IP
  if (hexesInvaded.length > 0) {
    const windowMs    = LIMITS.RECLAIM_WINDOW_MINUTES * 60 * 1000;
    const windowStart = new Date(Date.now() - windowMs);

    try {
      const { Invasion } = require('../config/models');
      const recentLosses = await Invasion.find({
        hexId:    { $in: hexesInvaded },
        ts:       { $gte: windowStart },
      }).select('defenderId hexId').lean();

      for (const loss of recentLosses) {
        if (loss.defenderId.toString() === userId.toString()) continue; // same user, ok

        // Check if previous defender shares this IP
        const defenderIpsKey = `ac:user_ips:${loss.defenderId}`;
        const defenderIps    = await redis.sMembers(defenderIpsKey);

        if (defenderIps.includes(requestIp)) {
          flags.push({
            type:   'account_farming_reclaim',
            weight: WEIGHT.account_farming_reclaim,
            detail: `Reclaiming hex ${loss.hexId} lost by different account on same IP within ${LIMITS.RECLAIM_WINDOW_MINUTES} min`,
          });
          break; // one farming flag per run
        }
      }
    } catch (err) {
      console.warn('[AntiCheat] Layer 6 reclaim check failed:', err.message);
    }
  }

  return { flags, accountsOnIp };
}

// ─────────────────────────────────────────────────────────────
// SCORING ENGINE
// Combines all flags → deduplicates by type → produces verdict
// ─────────────────────────────────────────────────────────────
function scoreRun(allFlags) {
  // Deduplicate — same flag type counted only once (worst instance wins)
  const bestByType = new Map();
  for (const flag of allFlags) {
    const existing = bestByType.get(flag.type);
    if (!existing || flag.weight > existing.weight) {
      bestByType.set(flag.type, flag);
    }
  }
  const dedupedFlags = [...bestByType.values()];
  const totalWeight  = dedupedFlags.reduce((s, f) => s + f.weight, 0);

  let verdict, creditMultiplier, message;

  if (totalWeight >= THRESHOLD.DISQUALIFY) {
    verdict          = 'disqualified';
    creditMultiplier = 0.0;
    message          = 'Run data looks unnatural. Credits not counted. Our system uses multi-layer movement validation.';
  } else if (totalWeight >= THRESHOLD.PARTIAL) {
    verdict          = 'partial';
    creditMultiplier = 0.5;
    message          = 'Some segments of your run were flagged. Partial credits awarded.';
  } else if (totalWeight >= THRESHOLD.WARN) {
    verdict          = 'warned';
    creditMultiplier = 0.75;
    message          = 'Minor anomalies detected in your run. Most credits counted.';
  } else {
    verdict          = 'clean';
    creditMultiplier = 1.0;
    message          = null;
  }

  return {
    verdict,
    creditMultiplier,
    totalWeight,
    flagCount:  dedupedFlags.length,
    flags:      dedupedFlags,
    message,
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN — Full anti-cheat pipeline
// Called from gps.processor.js before any credits or territory writes
// ─────────────────────────────────────────────────────────────

/**
 * @param {Array}   points         GPS points [{lat, lng, ts, hexId, altitude?}]
 * @param {number}  distanceKm     Total run distance
 * @param {Array}   hexesInvaded   Hex IDs runner tried to take from others
 * @param {string}  userId         Runner's MongoDB ObjectId string
 * @param {string}  requestIp      Runner's IP (from req.ip)
 * @param {object}  clientMeta     Optional: { isMockLocation: bool }
 * @returns {object} { verdict, creditMultiplier, validHexes, failedHexes, score }
 */
async function runAntiCheat(points, distanceKm, hexesInvaded, userId, requestIp, clientMeta = {}) {
  // Not enough data to analyze — treat as suspicious but don't hard-disqualify
  if (!points || points.length < 3) {
    return {
      verdict:          'disqualified',
      creditMultiplier: 0,
      validHexes:       [],
      failedHexes:      [],
      score: {
        verdict: 'disqualified', totalWeight: 200, flagCount: 1,
        flags: [{ type: 'insufficient_data', weight: 200, detail: 'Fewer than 3 GPS points recorded' }],
        message: 'Not enough GPS data to validate this run.',
      },
    };
  }

  const allFlags = [];

  // Layer 1 — Speed (sync)
  const { flags: speedFlags, speeds } = layer1_speed(points);
  allFlags.push(...speedFlags);

  // Layer 2 — Smoothness (sync, uses speeds from layer 1)
  const { flags: smoothFlags } = layer2_smoothness(points, speeds);
  allFlags.push(...smoothFlags);

  // Layer 3 — Pace (sync)
  const { flags: paceFlags } = layer3_pace(points, distanceKm);
  allFlags.push(...paceFlags);

  // Layer 4 — Dwell time (sync, most impactful for territory fairness)
  const { flags: dwellFlags, validHexes, failedHexes } = layer4_dwell(points);
  allFlags.push(...dwellFlags);

  // Layer 5 — Location integrity (sync)
  const { flags: integrityFlags } = layer5_integrity(points, clientMeta);
  allFlags.push(...integrityFlags);

  // Layer 6 — Account farming (async, Redis + DB)
  try {
    const { flags: farmingFlags } = await layer6_farming(userId, hexesInvaded, requestIp);
    allFlags.push(...farmingFlags);
  } catch (err) {
    // Non-fatal — log but don't block the run
    console.warn('[AntiCheat] Layer 6 (farming) failed gracefully:', err.message);
  }

  const score = scoreRun(allFlags);

  return {
    verdict:          score.verdict,
    creditMultiplier: score.creditMultiplier,
    validHexes,
    failedHexes,
    score,
  };
}

module.exports = {
  runAntiCheat,
  // Export layers individually for unit testing
  layer1_speed,
  layer2_smoothness,
  layer3_pace,
  layer4_dwell,
  layer5_integrity,
  layer6_farming,
  scoreRun,
  LIMITS,
  WEIGHT,
  THRESHOLD,
};
