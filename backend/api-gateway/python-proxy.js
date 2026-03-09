/**
 * Python Microservices Proxy
 * Routes /python/* requests to the appropriate Python service on its designated port
 * 
 * Service mapping:
 * /python/stats/**           → http://localhost:8001  (Run Statistics)
 * /python/hex/**             → http://localhost:8002  (Hex Analyzer)
 * /python/engagement/**      → http://localhost:8003  (Engagement Engine)
 * /python/leaderboard/**     → http://localhost:8004  (Leaderboard Predictor)
 * /python/territory/**       → http://localhost:8005  (Territory Analyzer)
 * /python/route-opt/**       → http://localhost:8006  (Route Optimizer)
 * /python/elevation/**       → http://localhost:8007  (Elevation Analyzer)
 * /python/heatmap/**         → http://localhost:8008  (Heatmap Generator)
 * /python/badges/**          → http://localhost:8011  (Badge Generator)
 * /python/challenges/**      → http://localhost:8016  (Challenge Recommender)
 * /python/names/**           → http://localhost:8017  (Run Name Generator)
 * /python/streak/**          → http://localhost:8018  (Streak Calculator)
 * /python/credits/**         → http://localhost:8019  (Credit Optimizer)
 */

const httpProxy = require('http-proxy');
const express = require('express');

const router = express.Router();

// Service port mapping
const PYTHON_SERVICES = {
  'stats': 8001,       // Run Statistics
  'hex': 8002,         // Hex Territory Analyzer
  'engagement': 8003,  // Engagement Engine
  'leaderboard': 8004, // Leaderboard Predictor
  'territory': 8005,   // Territory Analyzer
  'route-opt': 8006,   // Route Optimizer
  'elevation': 8007,   // Elevation Analyzer
  'heatmap': 8008,     // Heatmap Generator
  'badges': 8011,      // Badge Generator
  'challenges': 8016,  // Challenge Recommender
  'names': 8017,       // Run Name Generator
  'streak': 8018,      // Streak Calculator
  'credits': 8019,     // Credit Optimizer
};

// Health check endpoint
router.get('/health', async (req, res) => {
  const health = { healthy: [], unhealthy: [] };
  
  for (const [service, port] of Object.entries(PYTHON_SERVICES)) {
    try {
      const response = await fetch(`http://localhost:${port}/health`, { 
        timeout: 2000 
      }).catch(() => null);
      
      if (response?.ok) {
        health.healthy.push({ service, port, status: 'up' });
      } else {
        health.unhealthy.push({ service, port, status: 'down' });
      }
    } catch (err) {
      health.unhealthy.push({ service, port, status: 'error', error: err.message });
    }
  }
  
  const allHealthy = health.unhealthy.length === 0;
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    ...health,
    timestamp: new Date().toISOString(),
  });
});

// Proxy middleware: Forward /python/{service}/* to the appropriate Python service
router.use((req, res, next) => {
  // Parse: /service/endpoint/...
  const parts = req.path.split('/').filter(Boolean);
  if (parts.length < 1) {
    return res.status(400).json({ error: 'Invalid request path' });
  }
  
  const service = parts[0];
  const port = PYTHON_SERVICES[service];
  
  if (!port) {
    return res.status(404).json({ 
      error: `Unknown Python service: ${service}`,
      available: Object.keys(PYTHON_SERVICES),
    });
  }
  
  const target = `http://localhost:${port}`;
  
  // Create a proxy instance for this specific request
  const proxy = httpProxy.createProxyServer({
    target,
    changeOrigin: true,
    pathRewrite: {
      // Remove /service prefix before forwarding
      [`^/${service}`]: '',
    },
    onError: (err, req, res) => {
      console.error(`[Python Proxy] Error proxying to ${target}: ${err.message}`);
      res.status(503).json({
        error: `Python service unavailable: ${service}`,
        service,
        port,
        details: err.message,
      });
    },
  });
  
  proxy.web(req, res);
});

module.exports = router;
