/**
 * Heatmap Generator Service (Node.js Implementation)
 * Replaces Python service 08-heatmap-generator
 */
const express = require('express');
const router = express.Router();
const { Run, Territory } = require('../core/schema');
const { getFromCache, setCache } = require('../config/redis');
const h3 = require('h3-js');

/**
 * Grid-based heatmap bucketing
 */
function createGridBuckets(points, gridSize = 0.001) {
  const buckets = {};
  
  points.forEach(point => {
    const gridLat = Math.floor(point.lat / gridSize) * gridSize;
    const gridLng = Math.floor(point.lng / gridSize) * gridSize;
    const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;
    
    if (!buckets[key]) {
      buckets[key] = { lat: gridLat, lng: gridLng, intensity: 0 };
    }
    buckets[key].intensity++;
  });
  
  return Object.values(buckets);
}

/**
 * Normalize intensity to 0-100 scale
 */
function normalizeIntensity(buckets) {
  const max = Math.max(...buckets.map(b => b.intensity));
  if (max === 0) return buckets;
  
  return buckets.map(b => ({
    ...b,
    intensity: Math.round((b.intensity / max) * 100)
  }));
}

/**
 * Generate user activity heatmap
 * POST /heatmap/user-activity
 */
router.post('/user-activity', async (req, res) => {
  try {
    const { user_id, days = 30 } = req.body;
    
    const cacheKey = `heatmap:user:${user_id}:${days}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return res.json(cached);
    
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get user's runs
    const runs = await Run.find({
      user: user_id,
      createdAt: { $gte: cutoffDate }
    }).lean();
    
    // Get user's territories
    const territories = await Territory.find({ owner: user_id }).lean();
    
    // Collect all GPS points
    const allPoints = [];
    
    runs.forEach(run => {
      if (run.gps_trace && Array.isArray(run.gps_trace)) {
        run.gps_trace.forEach(point => {
          if (point.lat && point.lng) {
            allPoints.push({ lat: point.lat, lng: point.lng });
          }
        });
      }
    });
    
    // Add territory center points
    territories.forEach(t => {
      const [lat, lng] = h3.cellToLatLng(t.hex_id);
      allPoints.push({ lat, lng });
    });
    
    // Create grid buckets
    const buckets = createGridBuckets(allPoints);
    const normalized = normalizeIntensity(buckets);
    
    const result = {
      success: true,
      data: {
        user_id,
        period_days: days,
        total_points: allPoints.length,
        total_runs: runs.length,
        total_territories: territories.length,
        heatmap_cells: normalized.length,
        heatmap: normalized.sort((a, b) => b.intensity - a.intensity)
      }
    };
    
    await setCache(cacheKey, result, 3600);
    res.json(result);
    
  } catch (error) {
    console.error('User heatmap error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate area activity heatmap
 * POST /heatmap/area-activity
 */
router.post('/area-activity', async (req, res) => {
  try {
    const { bounds, days = 7 } = req.body;
    
    if (!bounds || !bounds.north || !bounds.south || !bounds.east || !bounds.west) {
      return res.status(400).json({ success: false, error: 'bounds required (north, south, east, west)' });
    }
    
    const cacheKey = `heatmap:area:${bounds.north}:${bounds.south}:${bounds.east}:${bounds.west}:${days}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return res.json(cached);
    
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Find all territories in bounds
    const territories = await Territory.find({
      createdAt: { $gte: cutoffDate }
    }).lean();
    
    // Filter by bounds
    const territoryPoints = territories
      .map(t => {
        const [lat, lng] = h3.cellToLatLng(t.hex_id);
        return { lat, lng, userId: t.owner };
      })
      .filter(p => 
        p.lat >= bounds.south && p.lat <= bounds.north &&
        p.lng >= bounds.west && p.lng <= bounds.east
      );
    
    // Create heatmap
    const buckets = createGridBuckets(territoryPoints, 0.001);
    const normalized = normalizeIntensity(buckets);
    
    // Count unique users in area
    const uniqueUsers = new Set(territoryPoints.map(p => p.userId)).size;
    
    const result = {
      success: true,
      data: {
        bounds,
        period_days: days,
        total_territories: territoryPoints.length,
        unique_users: uniqueUsers,
        heatmap_cells: normalized.length,
        heatmap: normalized.sort((a, b) => b.intensity - a.intensity).slice(0, 500) // Top 500 hotspots
      }
    };
    
    await setCache(cacheKey, result, 1800); // 30 min cache
    res.json(result);
    
  } catch (error) {
    console.error('Area heatmap error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate intensity matrix (grid-based heat distribution)
 * POST /heatmap/intensity-matrix
 */
router.post('/intensity-matrix', async (req, res) => {
  try {
    const { user_id, grid_size = 20 } = req.body;
    
    const cacheKey = `heatmap:matrix:${user_id}:${grid_size}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return res.json(cached);
    
    // Get user's recent runs
    const runs = await Run.find({ user: user_id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    const allPoints = [];
    runs.forEach(run => {
      if (run.gps_trace) {
        run.gps_trace.forEach(point => {
          if (point.lat && point.lng) {
            allPoints.push({ lat: point.lat, lng: point.lng });
          }
        });
      }
    });
    
    if (allPoints.length === 0) {
      return res.json({
        success: true,
        data: { matrix: [], grid_size, total_points: 0 }
      });
    }
    
    // Find bounds
    const lats = allPoints.map(p => p.lat);
    const lngs = allPoints.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Create matrix
    const cellSizeLat = (maxLat - minLat) / grid_size;
    const cellSizeLng = (maxLng - minLng) / grid_size;
    
    const matrix = Array(grid_size).fill(0).map(() => Array(grid_size).fill(0));
    
    allPoints.forEach(point => {
      const row = Math.min(Math.floor((point.lat - minLat) / cellSizeLat), grid_size - 1);
      const col = Math.min(Math.floor((point.lng - minLng) / cellSizeLng), grid_size - 1);
      matrix[row][col]++;
    });
    
    // Normalize to 0-100
    const maxVal = Math.max(...matrix.flat());
    const normalized = matrix.map(row =>
      row.map(val => maxVal > 0 ? Math.round((val / maxVal) * 100) : 0)
    );
    
    const result = {
      success: true,
      data: {
        matrix: normalized,
        grid_size,
        bounds: { minLat, maxLat, minLng, maxLng },
        total_points: allPoints.length
      }
    };
    
    await setCache(cacheKey, result, 3600);
    res.json(result);
    
  } catch (error) {
    console.error('Intensity matrix error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
