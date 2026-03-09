#!/usr/bin/env node
/**
 * Production Startup Script
 * Launches Python microservices first, then Node.js API gateway
 * 
 * Usage:
 *   node start-all.js [--skip-python]
 * 
 * Flags:
 *   --skip-python    Skip starting Python services (for debugging)
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const SKIP_PYTHON = process.argv.includes('--skip-python');
const PYTHON_SERVICES_DIR = path.join(__dirname, '../python-services');
const NODE_GATEWAY = path.join(__dirname, 'index.js');

const PYTHON_SERVICES = [
  { name: 'Run Statistics', dir: '01-run-statistics', port: 8001 },
  { name: 'Hex Analyzer', dir: '02-hex-analyzer', port: 8002 },
  { name: 'Engagement Engine', dir: '03-engagement-engine', port: 8003 },
  { name: 'Leaderboard Predictor', dir: '04-leaderboard-predictor', port: 8004 },
  { name: 'Territory Analyzer', dir: '05-territory-analyzer', port: 8005 },
  { name: 'Route Optimizer', dir: '06-route-optimization', port: 8006 },
  { name: 'Elevation Analyzer', dir: '07-elevation-analyzer', port: 8007 },
  { name: 'Heatmap Generator', dir: '08-heatmap-generator', port: 8008 },
  { name: 'Badge Generator', dir: '11-badge-generator', port: 8011 },
  { name: 'Challenge Recommender', dir: '16-challenge-recommender', port: 8016 },
  { name: 'Run Name Generator', dir: '17-run-name-generator', port: 8017 },
  { name: 'Streak Calculator', dir: '18-streak-calculator', port: 8018 },
  { name: 'Credit Optimizer', dir: '19-credit-optimizer', port: 8019 },
];

let startedProcesses = [];

/**
 * Check if a service is healthy
 */
async function checkHealth(port, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/health`, { timeout: 2000 }, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', reject);
      });
    } catch (err) {
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
      }
    }
  }
  return false;
}

/**
 * Start a Python service
 */
function startPythonService(service) {
  return new Promise((resolve, reject) => {
    const serviceDir = path.join(PYTHON_SERVICES_DIR, service.dir);
    const mainFile = path.join(serviceDir, 'main.py');
    
    if (!fs.existsSync(mainFile)) {
      console.log(`⚠️  ${service.name} not found at ${mainFile}, skipping...`);
      return resolve({ ...service, started: false, reason: 'File not found' });
    }
    
    process.stdout.write(`⏳ Starting ${service.name}... `);
    
    const pythonProcess = spawn('python', [mainFile], {
      cwd: serviceDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Wait for health check
    const healthCheckInterval = setInterval(async () => {
      const healthy = await checkHealth(service.port);
      if (healthy) {
        clearInterval(healthCheckInterval);
        startedProcesses.push(pythonProcess);
        console.log(`✅ Running on port ${service.port}`);
        resolve({ ...service, started: true, pid: pythonProcess.pid });
      }
    }, 500);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(healthCheckInterval);
      if (pythonProcess.exitCode === null) {
        console.log(`✅ Started (pid: ${pythonProcess.pid}, awaiting health...)`);
        startedProcesses.push(pythonProcess);
        resolve({ ...service, started: true, pid: pythonProcess.pid, tentative: true });
      }
    }, 30000);
    
    // Handle exit
    pythonProcess.on('exit', (code) => {
      clearInterval(healthCheckInterval);
      if (code !== 0) {
        console.log(`❌ Failed (exit code: ${code})`);
        if (stderr) console.error(`   Error: ${stderr.split('\n')[0]}`);
        resolve({ ...service, started: false, pid: pythonProcess.pid, exitCode: code });
      }
    });
    
    pythonProcess.on('error', (err) => {
      clearInterval(healthCheckInterval);
      console.log(`❌ Error: ${err.message}`);
      resolve({ ...service, started: false, error: err.message });
    });
  });
}

/**
 * Start Node.js API Gateway
 */
function startNodeGateway() {
  return new Promise((resolve) => {
    process.stdout.write(`⏳ Starting Node.js API Gateway... `);
    
    const nodeProcess = spawn('node', [NODE_GATEWAY], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    });
    
    startedProcesses.push(nodeProcess);
    
    // Give Node time to start and bind
    setTimeout(() => {
      console.log(`✅ API Gateway started`);
      resolve(nodeProcess);
    }, 2000);
    
    nodeProcess.on('exit', (code) => {
      console.error(`\n❌ API Gateway exited with code ${code}`);
      process.exit(code);
    });
  });
}

/**
 * Cleanup on exit
 */
function cleanup() {
  console.log('\n🛑 Shutting down all services...');
  for (const proc of startedProcesses) {
    if (proc && !proc.killed) {
      try {
        process.kill(-proc.pid); // Kill process group on Unix
      } catch (err) {
        // Windows might not support negative PIDs
        try {
          proc.kill();
        } catch (e) {
          // Ignore errors
        }
      }
    }
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

/**
 * Main startup sequence
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   Territory Run - Production Startup            ║');
  console.log('║   Python Microservices + Node.js API Gateway    ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  if (SKIP_PYTHON) {
    console.log('⚠️  Skipping Python services (--skip-python flag)...\n');
  } else {
    console.log(`📦 Starting ${PYTHON_SERVICES.length} Python microservices...\n`);
    
    // Start all Python services in parallel
    const results = await Promise.all(
      PYTHON_SERVICES.map(service => startPythonService(service))
    );
    
    // Count successes
    const started = results.filter(r => r.started).length;
    const failed = results.filter(r => !r.started).length;
    
    console.log(`\n✅ Python services: ${started} started, ${failed} failed\n`);
    
    if (failed > 0) {
      console.log('⚠️  Some Python services failed to start. API calls to those services will fail.');
      console.log('   Check Python environment and dependencies.\n');
    }
  }
  
  // Wait a moment before starting Node gateway
  await new Promise(r => setTimeout(r, 2000));
  
  console.log(`🚀 Starting Node.js API Gateway...\n`);
  await startNodeGateway();
  
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   🎉 All services are running!                 ║');
  console.log('║   API Gateway: http://localhost:4000           ║');
  console.log('║   Frontend:    http://localhost:3000           ║');
  console.log('║   Python Health: GET /python/health            ║');
  console.log('╚════════════════════════════════════════════════╝\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  cleanup();
  process.exit(1);
});
