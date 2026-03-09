# Production Deployment Guide - Territory Run

## 🚀 Complete Setup for Production (Python + Node.js)

This guide walks you through deploying the complete Territory Run application with all 13+ Python microservices and the Node.js API gateway.

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **Python** 3.10+ 
- **PostgreSQL** 14+ (for data storage)
- **Redis** 7+ (for caching and real-time)

### Verify Installation

```bash
node --version      # Should be v18+
python --version    # Should be 3.10+
psql --version      # Should be 14+
redis-cli --version # Should be 7+
```

---

## Environment Setup

### 1. Clone & Install Dependencies

```bash
cd Projects/runni5

# Install Node.js dependencies
cd backend
npm install

# Install Python dependencies
cd python-services
pip install -r requirements.txt
cd ../../
```

### 2. Configure Environment Variables

Create `.env` file in project root:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/runni5
MONGODB_URI=mongodb://localhost:27017/runni5

# Redis
REDIS_URL=redis://localhost:6379

# Frontend
FRONTEND_URL=http://localhost:3000

# API
PORT=4000
NODE_ENV=production

# Authentication (from your OAuth setup)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
APPLE_CLIENT_ID=your_apple_app_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY=your_apple_private_key

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...

# Groq API (for RAG bot)
GROQ_API_KEY=your_groq_api_key

# Render deployment (if using)
RENDER_EXTERNAL_URL=https://your-app.onrender.com
```

Also create `.env` in `backend/python-services/`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/runni5
REDIS_URL=redis://localhost:6379
```

---

## Database Setup

### 1. PostgreSQL Schema

```bash
# Connect to PostgreSQL
psql -U username -d runni5

# Run migrations (if available)
# Or: create tables as defined in backend/core/schema.js
```

If using MongoDB (for sessions/cache):

```bash
# Verify MongoDB is running
mongosh

# Create collections
use runni5
```

### 2. Seed Initial Data

```bash
cd backend
npm run seed:achievements
```

---

## Starting the Application

### Option A: Full Production (Recommended)

Starts both Python services and Node.js API gateway:

```bash
cd backend
npm run start:prod
```

**Output should show:**
```
⏳ Starting 13 Python microservices...
✅ Run Statistics started (PID: 12345, port 8001)
✅ Engagement Engine started (PID: 12346, port 8003)
... (11 more services)

✅ Python services: 13 started, 0 failed

🚀 Starting Node.js API Gateway...
✅ API Gateway started on port 4000

╔════════════════════════════════════════════════╗
║   🎉 All services are running!                 ║
║   API Gateway: http://localhost:4000           ║
║   Frontend:    http://localhost:3000           ║
║   Python Health: GET /python/health            ║
╚════════════════════════════════════════════════╝
```

### Option B: Node.js Only (Debug Python Separately)

Start just the API gateway (for debugging):

```bash
cd backend
npm run start:prod:no-python
# or
npm start  # For development with nodemon
```

### Option C: Start Python Services Manually

```bash
# Terminal 1: Run Statistics Service
cd backend/python-services/01-run-statistics
python main.py

# Terminal 2: Engagement Engine
cd backend/python-services/03-engagement-engine
python main.py

# Terminal 3: ... (start other services you need)

# Terminal N: Node.js API Gateway
cd backend
npm start
```

---

## Verify Installation

### Check Service Health

```bash
# All Python services
curl http://localhost:4000/python/health

# Specific service
curl http://localhost:8001/health        # Run Statistics
curl http://localhost:8003/health        # Engagement Engine
curl http://localhost:8018/health        # Streak Calculator
```

### Test API Gateway

```bash
# Basic health check
curl http://localhost:4000/health

# Create a test run (requires authentication token)
curl -X POST http://localhost:4000/run/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"distance_km": 5.2, "duration_ms": 1800000}'

# Call Run Statistics service via gateway
curl -X POST http://localhost:4000/python/stats/stats/run-analysis \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123", "time_period": "30"}'
```

### Access Frontend

Open browser to: **http://localhost:3000**

Navigate to **Python Demo** page (left sidebar) to see live Python service integrations.

---

## Service Port Map

| Service | Port | Endpoint Pattern |
|---------|------|------------------|
| **API Gateway** | 4000 | `http://localhost:4000/...` |
| **Run Statistics** | 8001 | `POST /stats/run-analysis` |
| **Hex Analyzer** | 8002 | `POST /hex/analyze` |
| **Engagement Engine** | 8003 | `POST /engagement/calculate-score` |
| **Leaderboard Predictor** | 8004 | `POST /leaderboard/predict` |
| **Territory Analyzer** | 8005 | `POST /territory/analyze` |
| **Route Optimizer** | 8006 | `POST /routes/optimize` |
| **Elevation Analyzer** | 8007 | `POST /elevation/analyze` |
| **Heatmap Generator** | 8008 | `POST /heatmap/generate` |
| **Badge Generator** | 8011 | `POST /badges/achievement` |
| **Challenge Recommender** | 8016 | `POST /challenges/recommend` |
| **Run Name Generator** | 8017 | `POST /names/generate` |
| **Streak Calculator** | 8018 | `POST /streak/calculate` |
| **Credit Optimizer** | 8019 | `POST /credits/optimize` |

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev    # Development: http://localhost:3000
# or
npm run build && npm start  # Production
```

Update `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Troubleshooting

### Python Services Not Starting

**Error:** "Python not found" or "main.py not found"

```bash
# Check Python is in PATH
which python           # Unix/Mac
where python           # Windows

# Check Python version
python --version       # Should be 3.10+

# Verify dependencies
pip list | grep fastapi
pip list | grep psycopg2
```

**Fix:** Reinstall Python dependencies:

```bash
cd backend/python-services
pip install --no-cache-dir -r requirements.txt
```

### API Gateway Can't Connect to Python Services

**Error:** `503 Python service unavailable`

1. Check if Python services are running:
   ```bash
   curl http://localhost:8001/health
   curl http://localhost:8003/health
   ```

2. Check if `http-proxy` is installed:
   ```bash
   npm list http-proxy
   ```

3. If missing, reinstall:
   ```bash
   cd backend
   npm install
   ```

### Database Connection Error

**Error:** `ECONNREFUSED PostgreSQL/MongoDB`

```bash
# Check if services are running
pg_isready -h localhost -p 5432    # PostgreSQL
mongodb-status                      # MongoDB
redis-cli ping                      # Redis

# Start them if needed:
# macOS
brew services start postgresql
brew services start mongodb-community
brew services start redis

# Linux (systemd)
sudo systemctl start postgresql
sudo systemctl start mongod
sudo systemctl start redis-server
```

### Port Already in Use

**Error:** `EADDRINUSE` on port 4000 or 8001-8019

```bash
# Find what's using the port (Unix/Mac)
lsof -i :4000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=4001 npm run start:prod
```

---

## Production Deployment (Render.com Example)

### 1. Create Render Service

- Create new "Web Service"
- Connect GitHub repository
- Build command: `cd backend && npm install && cd ../python-services && pip install -r requirements.txt`
- Start command: `npm run start:prod`
- Environment variable: `NODE_ENV=production`

### 2. Add Environment Variables

Go to Environment in Render dashboard:

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
FRONTEND_URL=https://your-app.onrender.com
NEXT_PUBLIC_API_URL=https://your-app.onrender.com/api
```

### 3. Deploy Frontend

- Deploy frontend separately to Vercel or Render
- Point `NEXT_PUBLIC_API_URL` to your production API

---

## Monitoring & Logs

### View Logs

```bash
# API Gateway logs
tail -f logs/api-gateway.log

# Python service logs
tail -f logs/python-services.log
```

### Check System Resources

```bash
# CPU & Memory usage
top
htop  # if installed

# Disk space
df -h

# Network connections
netstat -an | grep LISTEN  # Unix/Mac
```

### Performance Metrics

The Python services include built-in Prometheus metrics. Access at:

```
http://localhost:8001/metrics   # Any service port
```

---

## Stopping Services

### Graceful Shutdown

**With `npm run start:prod`:**

Press `Ctrl+C` in terminal - all processes will shut down gracefully.

**Individual Services:**

```bash
# Find Python process
ps aux | grep python

# Kill gracefully
kill -TERM <PID>
```

```bash
# Kill Node.js process
kill -TERM <PID>
```

---

## Advanced: Scale Python Services

Each Python service runs on its own port and process. To run **multiple instances** of a high-traffic service:

### Using PM2 (Process Manager)

```bash
npm install -g pm2

# Start all services with PM2
pm2 start python-services/01-run-statistics/main.py -i 4 --name "stats-cluster"
pm2 start python-services/03-engagement-engine/main.py -i 2 --name "engagement"

# Monitor
pm2 monit

# Logs
pm2 logs
```

### Update API Gateway

Edit `backend/api-gateway/python-proxy.js` to include load balancer:

```javascript
const httpProxy = require('http-proxy-middleware');
const { createProxyMiddleware } = require('http-proxy-middleware');

router.use('/stats/*', createProxyMiddleware({
  target: 'http://localhost:8001',  // Or HTTP/2 load balancer
  changeOrigin: true,
}));
```

---

## Security Checklist

- [ ] Environment variables not committed to Git
- [ ] Database credentials rotated regularly
- [ ] CORS origins configured correctly
- [ ] Rate limiting enabled on API gateway
- [ ] HTTPS/TLS enabled in production
- [ ] Python services only accessible through API gateway
- [ ] Database backups scheduled
- [ ] Monitoring and alerting configured

---

## Next Steps

1. ✅ Verify all services are running and healthy
2. ✅ Test Python features on `/python-demo` page
3. ✅ Run integration tests: `npm test`
4. ✅ Monitor performance in production
5. ✅ Set up automatic scaling if needed

---

**Need help?** Check logs, verify environment variables, and ensure all prerequisites are installed.
