/**
 * Elevation Analysis Service (Node.js Implementation)
 * Replaces Python service 07-elevation-analyzer
 */
const express = require('express');
const router = express.Router();
const { Run } = require('../core/schema');
const { getFromCache, setCache } = require('../config/redis');

/**
 * Calculate elevation gain/loss from GPS trace
 */
function calculateElevationMetrics(gpsTrace) {
  if (!gpsTrace || gpsTrace.length < 2) {
    return { gain: 0, loss: 0, avgGrade: 0, maxGrade: 0 };
  }
  
  let gain = 0, loss = 0, maxGrade = 0;
  
  for (let i = 1; i < gpsTrace.length; i++) {
    const prev = gpsTrace[i - 1];
    const curr = gpsTrace[i];
    
    if (!prev.elevation || !curr.elevation) continue;
    
    const elevDiff = curr.elevation - prev.elevation;
    
    if (elevDiff > 0) {
      gain += elevDiff;
    } else {
      loss += Math.abs(elevDiff);
    }
    
    // Calculate grade (assuming ~10m between points for GPS at 1Hz)
    const horizontalDist = 10; // meters (approximate)
    const grade = Math.abs((elevDiff / horizontalDist) * 100);
    maxGrade = Math.max(maxGrade, grade);
  }
  
  const avgGrade = (gain + loss) / (gpsTrace.length * 10) * 100; // Average grade
  
  return {
    gain: Math.round(gain),
    loss: Math.round(loss),
    avgGrade: avgGrade.toFixed(1),
    maxGrade: maxGrade.toFixed(1)
  };
}

/**
 * Classify terrain difficulty
 */
function classifyTerrain(avgGrade) {
  const grade = parseFloat(avgGrade);
  if (grade < 1) return 'flat';
  if (grade < 3) return 'rolling';
  if (grade < 6) return 'hilly';
  if (grade < 10) return 'mountainous';
  return 'extreme';
}

/**
 * Analyze single run elevation
 * POST /elevation/analyze-run
 */
router.post('/analyze-run', async (req, res) => {
  try {
    const { run_id, user_id } = req.body;
    
    if (!run_id) {
      return res.status(400).json({ success: false, error: 'run_id required' });
    }
    
    const cacheKey = `elevation:run:${run_id}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return res.json(cached);
    
    const run = await Run.findById(run_id).lean();
    if (!run) {
      return res.status(404).json({ success: false, error: 'Run not found' });
    }
    
    const metrics = calculateElevationMetrics(run.gps_trace);
    const terrain = classifyTerrain(metrics.avgGrade);
    
    const result = {
      success: true,
      data: {
        run_id,
        elevation_gain_m: metrics.gain,
        elevation_loss_m: metrics.loss,
        avg_grade_percent: metrics.avgGrade,
        max_grade_percent: metrics.maxGrade,
        terrain_type: terrain,
        distance_km: run.distance_km
      }
    };
    
    await setCache(cacheKey, result, 3600);
    res.json(result);
    
  } catch (error) {
    console.error('Elevation analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get user elevation stats over time period
 * POST /elevation/user-stats
 */
router.post('/user-stats', async (req, res) => {
  try {
    const { user_id, days = 30 } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id required' });
    }
    
    const cacheKey = `elevation:stats:${user_id}:${days}`;
    try {
      const cached = await getFromCache(cacheKey);
      if (cached) return res.json(cached);
    } catch (cacheErr) {
      // Cache failures should not fail the request.
    }
    
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const runs = await Run.find({
      userId: user_id,
      endedAt: { $gte: cutoffDate },
      isActive: false,
    }).lean();
    
    let totalGain = 0, totalLoss = 0;
    const terrainCounts = { flat: 0, rolling: 0, hilly: 0, mountainous: 0, extreme: 0 };
    
    runs.forEach(run => {
      if (run.gps_trace && run.gps_trace.length > 0) {
        const metrics = calculateElevationMetrics(run.gps_trace);
        totalGain += metrics.gain;
        totalLoss += metrics.loss;
        
        const terrain = classifyTerrain(metrics.avgGrade);
        terrainCounts[terrain]++;
      }
    });
    
    // Determine badges based on total gain
    const badges = [];
    if (totalGain >= 5000) badges.push('Sky Chaser');
    else if (totalGain >= 2000) badges.push('Hill Climber');
    else if (totalGain >= 500) badges.push('Elevation Explorer');
    else badges.push('Flat Runner');
    
    const dominantTerrain = Object.entries(terrainCounts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || 'flat';

    const result = {
      success: true,
      data: {
        user_id,
        period_days: Number(days),
        runs_analyzed: runs.length,
        total_runs: runs.length,
        total_elevation_gain: totalGain,
        total_elevation_loss: totalLoss,
        average_grade: runs.length > 0 ? Number(((totalGain + totalLoss) / Math.max(1, runs.length * 100)).toFixed(1)) : 0,
        terrain_classification: dominantTerrain,
        terrain_distribution: terrainCounts,
        badges_earned: badges,
      }
    };
    
    try {
      await setCache(cacheKey, result, 3600);
    } catch (cacheErr) {
      // Ignore cache write failures.
    }
    res.json(result);
    
  } catch (error) {
    console.error('Elevation stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Quick elevation analysis from GPS trace
 * POST /elevation/trace-analysis
 */
router.post('/trace-analysis', async (req, res) => {
  try {
    const { gps_trace } = req.body;
    
    if (!gps_trace || !Array.isArray(gps_trace)) {
      return res.status(400).json({ success: false, error: 'gps_trace array required' });
    }
    
    const metrics = calculateElevationMetrics(gps_trace);
    const terrain = classifyTerrain(metrics.avgGrade);
    
    res.json({
      success: true,
      data: {
        elevation_gain_m: metrics.gain,
        elevation_loss_m: metrics.loss,
        avg_grade_percent: metrics.avgGrade,
        max_grade_percent: metrics.maxGrade,
        terrain_type: terrain,
        points_analyzed: gps_trace.length
      }
    });
    
  } catch (error) {
    console.error('Trace analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
