// reports-service/routes.js  [v2 — full community policing]
// ============================================================
// REPORTS — Community Policing + Auto-Review + Shadow Banning
// ============================================================
// PHILOSOPHY:
//   Gamers LOVE snitching. Use it.
//   Multiple reports → auto-review → shadow penalty.
//   Shadow ban = still plays, earns nothing, excluded from boards.
//   Repeat offenders escalate automatically.
// ============================================================
const express      = require('express');
const { Report, Run, GpsPoint, User } = require('../config/models');
const { requireAuth }                 = require('../middleware/auth');
const { runAntiCheat }                = require('../run-service/anticheat.engine');

const router = express.Router();

// How many open reports before auto-review kicks in
const AUTO_REVIEW_THRESHOLD = 3;
// How many total strikes before shadow ban
const SHADOW_BAN_THRESHOLD  = 5;

// ─────────────────────────────────────────────────────────────
// POST /reports
// File a report against a user or specific run
// ─────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { targetUserId, runId, type, details } = req.body;

    if (!targetUserId || !type) {
      return res.status(400).json({ error: 'targetUserId and type required' });
    }
    if (!['gps_spoof', 'impossible_speed', 'account_farming', 'abuse'].includes(type)) {
      return res.status(400).json({
        error: 'type must be: gps_spoof | impossible_speed | account_farming | abuse',
      });
    }
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }

    // Rate limit: 5 reports per reporter per day
    const startOfDay = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z');
    const todayCount = await Report.countDocuments({ reporterId: req.userId, ts: { $gte: startOfDay } });
    if (todayCount >= 5) {
      return res.status(429).json({ error: 'Report limit reached (5/day).' });
    }

    // Prevent duplicate reports on same run from same reporter
    if (runId) {
      const dupe = await Report.findOne({ reporterId: req.userId, runId });
      if (dupe) return res.status(409).json({ error: 'You have already reported this run.' });
    }

    const targetUser = await User.findById(targetUserId).select('username antiCheat').lean();
    if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

    // ── Auto-analyze GPS run if spoof/speed report ────────────
    let autoAnalysis = null;
    if (['gps_spoof', 'impossible_speed'].includes(type) && runId) {
      autoAnalysis = await analyzeRunForReport(runId, targetUserId);
    }

    // ── Create report ─────────────────────────────────────────
    const report = await Report.create({
      reporterId:   req.userId,
      targetId:     targetUserId,
      type,
      runId:        runId || null,
      details:      (details || '').slice(0, 500),
      status:       'open',
      autoAnalysis: autoAnalysis
        ? { weight: autoAnalysis.totalWeight, verdict: autoAnalysis.verdict }
        : null,
      ts: new Date(),
    });

    // ── Check if auto-review threshold reached ────────────────
    const openReports = await Report.countDocuments({
      targetId: targetUserId,
      status:   'open',
    });

    let escalation = null;
    if (openReports >= AUTO_REVIEW_THRESHOLD) {
      escalation = await handleAutoReview(targetUserId, openReports);
    }

    res.status(201).json({
      message:     'Report submitted. Thank you for helping keep the game fair.',
      reportId:    report._id,
      autoAnalysis: autoAnalysis ? {
        verdict:     autoAnalysis.verdict,
        totalWeight: autoAnalysis.totalWeight,
        flagCount:   autoAnalysis.flagCount,
        topFlags:    autoAnalysis.flags.slice(0, 3).map(f => f.detail),
      } : null,
      escalation,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /reports/run/:runId/analyze
// Transparency endpoint — runner sees their own anti-cheat results
// ─────────────────────────────────────────────────────────────
router.get('/run/:runId/analyze', requireAuth, async (req, res, next) => {
  try {
    const run = await Run.findOne({ _id: req.params.runId, userId: req.userId })
      .select('antiCheat status creditsEarned kmDistance gpsPointCount hexesClaimed hexesInvaded')
      .lean();

    if (!run) return res.status(404).json({ error: 'Run not found' });

    res.json({
      runId:        req.params.runId,
      status:       run.status,
      creditsEarned: run.creditsEarned,
      verdict:      run.antiCheat?.verdict || 'not_checked',
      creditMultiplier: run.antiCheat?.creditMultiplier || 1.0,
      totalWeight:  run.antiCheat?.totalWeight || 0,
      flagCount:    run.antiCheat?.flagCount || 0,
      checkedAt:    run.antiCheat?.checkedAt || null,
      // We intentionally don't expose exact flags — prevents gaming the system
      message: run.status === 'flagged'
        ? 'This run was flagged by our movement validation system. Credits were not awarded.'
        : run.antiCheat?.verdict === 'clean'
          ? 'This run passed all movement checks.'
          : run.antiCheat?.verdict
            ? `This run had anomalies detected. ${run.antiCheat.creditMultiplier * 100}% credits awarded.`
            : 'Analysis data unavailable for this run.',
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /reports/my-strikes
// User sees their own warning history (transparency)
// ─────────────────────────────────────────────────────────────
router.get('/my-strikes', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .select('antiCheat username').lean();

    const flaggedRunCount = await Run.countDocuments({
      userId: req.userId, status: 'flagged',
    });

    res.json({
      strikeCount:  user.antiCheat?.strikeCount || 0,
      shadowBanned: user.antiCheat?.shadowBanned || false,
      flaggedRuns:  flaggedRunCount,
      message:      user.antiCheat?.shadowBanned
        ? 'Your account has restrictions due to repeated violations. Contact support if you believe this is an error.'
        : 'No active restrictions on your account.',
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// INTERNAL — Run full anti-cheat analysis on a reported run
// Used by POST /reports to auto-analyze on creation
// ─────────────────────────────────────────────────────────────
async function analyzeRunForReport(runId, targetUserId) {
  try {
    const points = await GpsPoint.find({ runId })
      .sort({ ts: 1 })
      .select('lat lng ts accuracy hexId altitude')
      .lean();

    if (points.length < 3) return null;

    const run = await Run.findById(runId).select('kmDistance hexesInvaded').lean();
    if (!run) return null;

    const ac = await runAntiCheat(
      points,
      run.kmDistance || 0,
      run.hexesInvaded || [],
      targetUserId,
      null, // no IP available for retrospective analysis
      {}
    );

    return {
      verdict:     ac.score.verdict,
      totalWeight: ac.score.totalWeight,
      flagCount:   ac.score.flagCount,
      flags:       ac.score.flags,
    };
  } catch (err) {
    console.warn('[Reports] Auto-analysis failed:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// INTERNAL — Handle auto-review escalation
// Called when open report count hits AUTO_REVIEW_THRESHOLD
// ─────────────────────────────────────────────────────────────
async function handleAutoReview(targetUserId, openReportCount) {
  const user = await User.findById(targetUserId)
    .select('username antiCheat').lean();
  if (!user) return null;

  const strikeCount = user.antiCheat?.strikeCount || 0;

  // Check how many of their recent runs were flagged by the system
  const last30days   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const flaggedRecent = await Run.countDocuments({
    userId: targetUserId, status: 'flagged', endedAt: { $gte: last30days },
  });

  // Shadow ban if: 5+ strikes OR 3+ community reports AND system also flagged them
  const shouldShadowBan =
    strikeCount >= SHADOW_BAN_THRESHOLD ||
    (openReportCount >= AUTO_REVIEW_THRESHOLD && flaggedRecent >= 2);

  if (shouldShadowBan && !user.antiCheat?.shadowBanned) {
    await User.updateOne({ _id: targetUserId }, {
      $set: {
        'antiCheat.shadowBanned':   true,
        'antiCheat.shadowBannedAt': new Date(),
      },
    });

    // Mark all open reports as reviewed
    await Report.updateMany(
      { targetId: targetUserId, status: 'open' },
      { $set: { status: 'reviewed', reviewNote: 'Auto-reviewed: shadow ban applied' } }
    );

    return {
      action:  'shadow_banned',
      reason:  `${openReportCount} community reports + ${flaggedRecent} system-flagged runs`,
    };
  }

  return {
    action:  'flagged_for_review',
    reason:  `${openReportCount} open reports queued for manual review`,
  };
}

module.exports = router;
