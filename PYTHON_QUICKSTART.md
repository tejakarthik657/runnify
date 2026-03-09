# 🚀 Quick Start: Python Services in Production

**Status:** ✅ Ready to Deploy  
**Commit:** `dabed65`  
**Date:** March 9, 2026

---

## What's New

Your Python microservices (Run Stats, Engagement, Streak, etc.) are now **fully connected** to the API gateway and ready for production.

### Before (❌)
- Python services existed but weren't accessible from the frontend
- No way to call `/python/*` endpoints
- Manual startup of 13+ services required

### Now (✅)
- All 13 Python services accessible via single `/python/health` endpoint
- Frontend components automatically call the correct service ports
- One command starts everything: `npm run start:prod`

---

## 🎯 How to Use

### 1. **Install Dependencies** (One Time)

```bash
cd backend
npm install
```

### 2. **Start Everything**

```bash
# Launches all 13 Python services + Node.js API gateway
npm run start:prod
```

**Expected Output:**
```
Starting 13 Python microservices...
✅ Run Statistics started (port 8001)
✅ Engagement Engine started (port 8003)
... (11 more services)
🚀 Starting Node.js API Gateway...
✅ API Gateway started on port 4000

🎉 All services are running!
API Gateway: http://localhost:4000
Frontend:    http://localhost:3000
Python Health: GET /python/health
```

### 3. **Verify Everything Works**

```bash
# Check API gateway
curl http://localhost:4000/health

# Check Python services
curl http://localhost:4000/python/health

# Test an endpoint
curl -X POST http://localhost:4000/python/stats/stats/run-analysis \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test", "time_period": "30"}'
```

### 4. **See It in Action**

Open browser: **http://localhost:3000/python-demo**

You'll see live widgets:
- 📊 Run Stats (pace, distance, calories)
- 💪 Engagement Score (0-100)
- 🔥 Streak Counter
- 🏅 Territory Analysis
- 📈 Elevation analyzer
- 🔥 Activity Heatmap

---

## 🛠️ What Was Built

| Component | Purpose | Size |
|-----------|---------|------|
| `python-proxy.js` | Routes `/python/*` to correct service ports | 120 lines |
| `start-all.js` | Orchestrates Python + Node.js startup | 280 lines |
| `test-integration.js` | Tests that services work correctly | 170 lines |
| Updated `package.json` | Added `http-proxy` + new npm scripts | 5 lines |
| Updated `index.js` | Mounted Python proxy at `/python` | 2 lines |

**Total:** 7 new/modified files, 1,306 additions

---

## 🔧 Startup Options

### Option A: Full Production (Recommended)
```bash
npm run start:prod
```
Starts all 13 Python services + API gateway.

### Option B: Development (Debug Python Separately)
```bash
npm start  # or npm run dev with nodemon
```
Starts only API gateway. Start Python services manually:
```bash
cd python-services/01-run-statistics
python main.py
```

### Option C: Skip Python (API Gateway Only)
```bash
npm run start:prod:no-python
```
For debugging when Python services aren't available.

---

## 📍 Service Ports

| Service | Port | Example Endpoint |
|---------|------|------------------|
| API Gateway | 4000 | `http://localhost:4000` |
| Run Statistics | 8001 | `/python/stats/stats/run-analysis` |
| Hex Analyzer | 8002 | `/python/hex/analyze` |
| **Engagement Engine** | **8003** | `/python/engagement/calculate-score` |
| Territory Analyzer | 8005 | `/python/territory/analyze` |
| Elevation Analyzer | 8007 | `/python/elevation/analyze` |
| **Badge Generator** | **8011** | `/python/badges/achievement` |
| **Streak Calculator** | **8018** | `/python/streak/calculate` |
| Credit Optimizer | 8019 | `/python/credits/optimize` |
| ... (4 more services) | ... | ... |

All accessed via gateway: **`http://localhost:4000/python/{service}/{endpoint}`**

---

## ✅ Verification Checklist

- [ ] `npm install` completed without errors
- [ ] `http-proxy` is installed: `npm list http-proxy`
- [ ] Python 3.10+ installed: `python --version`
- [ ] Python dependencies installed: `pip list | grep fastapi`
- [ ] Database running: PostgreSQL or MongoDB accessible
- [ ] Redis running: `redis-cli ping` returns PONG
- [ ] No other services on ports 4000-8019
- [ ] Environment variables set (.env file with DATABASE_URL, REDIS_URL)

---

## 🚨 Troubleshooting

### "Python not found"
```bash
# Check Python is installed
python --version   # Should be 3.10+

# Add Python to PATH if needed
# Then reinstall dependencies
pip install -r backend/python-services/requirements.txt
```

### "Port already in use"
```bash
# Find what's using the port
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Kill the process
kill -9 <PID>
```

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
pg_isready -h localhost

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### Services return 503 error
```bash
# Verify Python services are running
curl http://localhost:8001/health
curl http://localhost:8003/health

# Check that Python services started successfully
# Look at the npm run start:prod output
```

---

## 📊 What Each Service Does

**Run Statistics (8001)** - Calculate pace, distance, calories, personal records  
**Engagement Engine (8003)** - Score user activity (0-100), predict churn  
**Streak Calculator (8018)** - Track consecutive running days  
**Badge Generator (8011)** - Create achievement badges with QR codes  
**Territory Analyzer (8005)** - Find expansion paths, analyze vulnerability  
**Elevation Analyzer (8007)** - Calculate climb difficulty  
**Heatmap Generator (8008)** - Create activity density visualization  
**Route Optimizer (8006)** - Find best paths for credits  
**And 5 more...**

---

## 📝 Files Modified/Created

**Created:**
- `backend/api-gateway/python-proxy.js` - HTTP proxy middleware
- `backend/api-gateway/start-all.js` - Startup orchestrator
- `backend/test-integration.js` - Integration tests
- `PYTHON_INTEGRATION_SUMMARY.md` - Full implementation docs
- `PRODUCTION_SETUP.md` - Complete deployment guide

**Modified:**
- `backend/package.json` - Added http-proxy, new scripts
- `backend/api-gateway/index.js` - Imported and mounted proxy

**Unchanged:**
- Frontend components - Already configured correctly!
- Python services - Already implemented!

---

## 🎯 What's Next

1. ✅ Run `npm install` to update dependencies
2. ✅ Run `npm run start:prod` to launch everything
3. ✅ Visit `http://localhost:3000/python-demo` to test the UI
4. ✅ Deploy to production using PRODUCTION_SETUP.md guide

---

## 📚 Documentation

- [Full Setup Guide](./PRODUCTION_SETUP.md)
- [Implementation Details](./PYTHON_INTEGRATION_SUMMARY.md)
- [Integration Tests](./backend/test-integration.js)

---

**Questions?** Check the logs:
```bash
npm run start:prod 2>&1 | tee deploy.log
```

All Python service exceptions are logged to the terminal.

---

**You're all set!** 🚀 Your Territory Run π application is now production-ready with full Python microservices integration.
