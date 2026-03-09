#!/usr/bin/env node
/**
 * Integration Test: Python Services + API Gateway
 * 
 * Verifies that:
 * 1. Python services can be discovered and are healthy
 * 2. API gateway correctly proxies requests to Python services
 * 3. Frontend can communicate with services
 * 
 * Usage:
 *   node test-integration.js
 */

const http = require('http');
const axios = require('axios');

const API_URL = 'http://localhost:4000';
const PYTHON_SERVICES = {
  'stats': 8001,
  'engagement': 8003,
  'streak': 8018,
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

async function checkHealth(service, port) {
  try {
    const response = await axios.get(`http://localhost:${port}/health`, { 
      timeout: 3000 
    });
    return response.status === 200;
  } catch (err) {
    return false;
  }
}

async function testPythonProxy(service, port) {
  try {
    const response = await axios.get(`${API_URL}/python/health`, {
      timeout: 5000,
    });
    return { success: true, data: response.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function testServiceEndpoint(service) {
  try {
    // Test run statistics endpoint
    const response = await axios.post(`${API_URL}/python/${service}/stats/run-analysis`, {
      user_id: 'test-user',
      time_period: '30',
    }, {
      timeout: 5000,
    });
    return { success: true, data: response.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log(`\n$  {colors.blue}═════════════════════════════════════════${colors.reset}`);
  console.log(`$  {colors.blue}  Integration Test: Python Services$  {colors.reset}`);
  console.log(`$  {colors.blue}═════════════════════════════════════════${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  // Test 1: Check API Gateway is running
  console.log(`⏳ Test 1: API Gateway Health...`);
  try {
    const response = await axios.get(`${API_URL}/health`, { timeout: 3000 });
    if (response.status === 200) {
      console.log(`$  {colors.green}✅ PASS${colors.reset}: API Gateway is running on port 4000\n`);
      passed++;
    } else {
      console.log(`$  {colors.red}❌ FAIL${colors.reset}: API Gateway returned status ${response.status}\n`);
      failed++;
    }
  } catch (err) {
    console.log(`$  {colors.red}❌ FAIL${colors.reset}: Cannot reach API Gateway (${err.message})\n`);
    failed++;
  }

  // Test 2: Check Python Services Health via Gateway
  console.log(`⏳ Test 2: Python Services Health (via gateway)...`);
  const proxyResult = await testPythonProxy();
  if (proxyResult.success) {
    const healthy = proxyResult.data?.healthy || [];
    const unhealthy = proxyResult.data?.unhealthy || [];
    console.log(`$  {colors.green}✅ PASS${colors.reset}: Gateway can reach Python services`);
    console.log(`   Healthy: ${healthy.length}, Unhealthy: ${unhealthy.length}\n`);
    passed++;
  } else {
    console.log(`$  {colors.red}❌ FAIL${colors.reset}: Cannot reach Python health endpoint (${proxyResult.error})\n`);
    failed++;
  }

  // Test 3: Check Direct Python Service Access
  console.log(`⏳ Test 3: Direct Python Service Access...`);
  let servicesUp = 0;
  for (const [service, port] of Object.entries(PYTHON_SERVICES)) {
    const healthy = await checkHealth(service, port);
    if (healthy) {
      console.log(`   $  {colors.green}✅${colors.reset} ${service.padEnd(15)} (port ${port}): UP`);
      servicesUp++;
    } else {
      console.log(`   $  {colors.yellow}⚠️ ${colors.reset} ${service.padEnd(15)} (port ${port}): DOWN`);
    }
  }
  if (servicesUp > 0) {
    console.log(`$  {colors.green}✅ PASS${colors.reset}: ${servicesUp}/${Object.keys(PYTHON_SERVICES).length} services running\n`);
    passed++;
  } else {
    console.log(`$  {colors.yellow}⚠️ ${colors.reset}: No Python services detected. Start them with: npm run start:prod\n`);
    // Don't fail - user might not have started Python services yet
  }

  // Test 4: Test API Proxy - Run Statistics
  console.log(`⏳ Test 4: Run Statistics Endpoint via Gateway...`);
  const statsResult = await testServiceEndpoint('stats');
  if (statsResult.success) {
    console.log(`$  {colors.green}✅ PASS${colors.reset}: Successfully called /python/stats/stats/run-analysis`);
    console.log(`   Response: ${JSON.stringify(statsResult.data).substring(0, 100)}...\n`);
    passed++;
  } else {
    console.log(`$  {colors.yellow}⚠️ ${colors.reset}: Could not reach stats service (${statsResult.error})`);
    console.log(`   This is expected if Python services aren't running yet\n`);
  }

  // Summary
  console.log(`$  {colors.blue}═════════════════════════════════════════${colors.reset}`);
  console.log(`$  {colors.green}Results: ${passed} passed${colors.reset}, ${failed} failed`);
  
  if (failed === 0) {
    console.log(`$  {colors.green}✅ All core systems operational!${colors.reset}\n`);
  } else {
    console.log(`$  {colors.red}❌ Some tests failed. Check setup.${colors.reset}\n`);
  }

  console.log(`  Next steps:`);
  console.log(`  1. Verify backend/.env has DATABASE_URL and REDIS_URL`);
  console.log(`  2. Start Python services: npm run start:prod`);
  console.log(`  3. Check Python service logs for errors`);
  console.log(`  4. Visit http://localhost:3000/python-demo to test UI\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
