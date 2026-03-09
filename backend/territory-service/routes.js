/**
 * Territory Analysis Service (Node.js Implementation)
 * Replaces Python service 05-territory-analyzer
 */
const express = require('express');
const router = express.Router();
const { Territory, Run } = require('../core/schema');
const { getFromCache, setCache } = require('../config/redis');

// H3 for hex calculations
const h3 = require('h3-js');

/**
 * Analyze user's territory expansion patterns
 * POST /territory/analyze
 */
router.post('/analyze', async (req, res) => {
  try {
    const { user_id, analysis_type = 'expansion' } = req.body;
    
    const cacheKey = `territory:analysis:${user_id}:${analysis_type}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return res.json(cached);
    
    // Fetch user's territories
    const territories = await Territory.find({ owner: user_id })
      .sort({ createdAt: -1 })
      .lean();
    
    if (territories.length === 0) {
      return res.json({
        success: true,
        data: {
          total_territories: 0,
          expansion_rate: 0,
          vulnerability_score: 0,
          efficiency: 0
        }
      });
    }
    
    // Calculate expansion metrics
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    const todayTerritories = territories.filter(t => new Date(t.createdAt).getTime() > dayAgo);
    const weekTerritories = territories.filter(t => new Date(t.createdAt).getTime() > weekAgo);
    
    // Calculate vulnerability (territories with low defense)
    const vulnerableTerritories = territories.filter(t => 
      !t.last_visited || (now - new Date(t.last_visited).getTime() > 24 * 60 * 60 * 1000)
    );
    
    const result = {
      success: true,
      data: {
        total_territories: territories.length,
        today_captured: todayTerritories.length,
        week_captured: weekTerritories.length,
        expansion_rate: (weekTerritories.length / 7).toFixed(2),
        vulnerability_score: (vulnerableTerritories.length / territories.length).toFixed(2),
        vulnerable_count: vulnerableTerritories.length,
        efficiency: territories.length > 0 ? (territories.length / (territories.length + vulnerableTerritories.length)).toFixed(2) : 0
      }
    };
    
    await setCache(cacheKey, result, 3600); // 1 hour cache
    res.json(result);
    
  } catch (error) {
    console.error('Territory analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get expansion path suggestions
 * POST /territory/expansion-path
 */
router.post('/expansion-path', async (req, res) => {
  try {
    const { user_id, start_hex, max_distance = 5 } = req.body;
    
    if (!start_hex) {
      return res.status(400).json({ success: false, error: 'start_hex required' });
    }
    
    const cacheKey = `territory:expansion:${user_id}:${start_hex}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return res.json(cached);
    
    // Get user's existing territories
    const userTerritories = await Territory.find({ owner: user_id }).lean();
    const userHexes = new Set(userTerritories.map(t => t.hex_id));
    
    // Get all nearby hexes in rings
    const suggestions = [];
    for (let ring = 1; ring <= max_distance; ring++) {
      const ringHexes = h3.gridRingUnsafe(start_hex, ring);
      
      for (const hex of ringHexes) {
        if (userHexes.has(hex)) continue; // Already owned
        
        // Check if this hex is taken by someone else
        const existingTerritory = await Territory.findOne({ hex_id: hex }).lean();
        
        suggestions.push({
          hex_id: hex,
          distance: ring,
          owned_by: existingTerritory ? existingTerritory.owner : null,
          priority: existingTerritory ? 'low' : 'high', // Prefer unclaimed hexes
          coordinates: h3.cellToLatLng(hex)
        });
      }
    }
    
    // Sort by priority (unclaimed first, then by distance)
    suggestions.sort((a, b) => {
      if (a.owned_by === null && b.owned_by !== null) return -1;
      if (a.owned_by !== null && b.owned_by === null) return 1;
      return a.distance - b.distance;
    });
    
    const result = {
      success: true,
      data: {
        start_hex,
        total_suggestions: suggestions.length,
        suggestions: suggestions.slice(0, 20) // Top 20 suggestions
      }
    };
    
    await setCache(cacheKey, result, 3600);
    res.json(result);
    
  } catch (error) {
    console.error('Expansion path error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Analyze territory vulnerability
 * POST /territory/vulnerability
 */
router.post('/vulnerability', async (req, res) => {
  try {
    const { user_id, threshold = 0.5 } = req.body;
    
    const cacheKey = `territory:vulnerability:${user_id}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return res.json(cached);
    
    const territories = await Territory.find({ owner: user_id }).lean();
    const now = Date.now();
    
    const vulnerabilityAnalysis = territories.map(t => {
      const hoursSinceVisit = t.last_visited 
        ? (now - new Date(t.last_visited).getTime()) / (1000 * 60 * 60)
        : 999;
      
      const invadeCount = t.invaded_count || 0;
      
      // Vulnerability score: higher = more vulnerable
      const vulnerabilityScore = Math.min(1, (hoursSinceVisit / 24) * 0.7 + (invadeCount / 10) * 0.3);
      
      return {
        hex_id: t.hex_id,
        hours_since_visit: hoursSinceVisit.toFixed(1),
        invaded_count: invadeCount,
        vulnerability_score: vulnerabilityScore.toFixed(2),
        risk_level: vulnerabilityScore > 0.7 ? 'high' : vulnerabilityScore > 0.4 ? 'medium' : 'low',
        coordinates: h3.cellToLatLng(t.hex_id)
      };
    });
    
    // Filter by threshold
    const vulnerableTerritories = vulnerabilityAnalysis.filter(
      t => parseFloat(t.vulnerability_score) >= threshold
    );
    
    const result = {
      success: true,
      data: {
        total_territories: territories.length,
        vulnerable_territories: vulnerableTerritories.length,
        threshold,
        territories: vulnerableTerritories.sort((a, b) => 
          parseFloat(b.vulnerability_score) - parseFloat(a.vulnerability_score)
        )
      }
    };
    
    await setCache(cacheKey, result, 1800); // 30 min cache
    res.json(result);
    
  } catch (error) {
    console.error('Vulnerability analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
