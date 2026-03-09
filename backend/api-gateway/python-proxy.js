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

const HEALTH_TIMEOUT_MS = Number(process.env.PYTHON_HEALTH_TIMEOUT_MS || 2000);

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

function getServiceProxy(target) {
  const proxy = httpProxy.createProxyServer({
    target,
    changeOrigin: true,
    proxyTimeout: 10000,
    timeout: 10000,
  });

  proxy.on('error', (err, req, res) => {
    console.error(`[Python Proxy] Error proxying to ${target}: ${err.message}`);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Python service unavailable',
        details: err.message,
      });
    }
  });

  return proxy;
}

const proxyByService = Object.fromEntries(
  Object.entries(PYTHON_SERVICES).map(([service, port]) => [
    service,
    getServiceProxy(`http://localhost:${port}`),
  ]),
);

// Health check endpoint
router.get('/health', async (req, res) => {
  const health = { healthy: [], unhealthy: [] };
  
  for (const [service, port] of Object.entries(PYTHON_SERVICES)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    try {
      const response = await fetch(`http://localhost:${port}/health`, { 
        signal: controller.signal,
      }).catch(() => null);
      
      if (response?.ok) {
        health.healthy.push({ service, port, status: 'up' });
      } else {
        health.unhealthy.push({ service, port, status: 'down' });
      }
    } catch (err) {
      health.unhealthy.push({ service, port, status: 'error', error: err.message });
    } finally {
      clearTimeout(timer);
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
  const proxy = proxyByService[service];
  
  if (!port || !proxy) {
    return res.status(404).json({ 
      error: `Unknown Python service: ${service}`,
      available: Object.keys(PYTHON_SERVICES),
    });
  }
  
  // Strip service prefix (e.g. /stats/stats/run-analysis -> /stats/run-analysis)
  req.url = `/${parts.slice(1).join('/')}`;

  proxy.web(req, res);
});

module.exports = router;
