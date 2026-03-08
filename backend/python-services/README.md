# Python Microservices for Territory Run

## 🎯 Overview

20 lightweight Python microservices that add advanced analytics, engagement tracking, badges, and optimization features to Territory Run. **All free tier, no GPU required.**

## 📦 What's Included

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **01: Run Statistics** | 8001 | Calculate pace, PRs, weekly summaries | ✅ Implemented |
| **02: Hex Analyzer** | 8002 | Territory analysis, expansion suggestions | ✅ Implemented |
| **03: Engagement Engine** | 8003 | Engagement scores, churn prediction | ✅ Implemented |
| **04: Leaderboard Predictor** | 8004 | Predict rank movement and points gaps | ✅ Implemented |
| **05: Territory Analyzer** | 8005 | Expansion path and vulnerability analysis | ✅ Implemented |
| **06: Route Optimizer** | 8006 | Route waypoints, yield estimate, safe zones | ✅ Implemented |
| **07: Elevation Analyzer** | 8007 | Elevation gain/loss and terrain difficulty | ✅ Implemented |
| **08: Heatmap Generator** | 8008 | User and area activity heatmap data | ✅ Implemented |
| **11: Badge Generator** | 8011 | Achievement badges, QR codes (PIL) | ✅ Implemented |
| **16: Challenge Recommender** | 8016 | Personalized challenge recommendations | ✅ Implemented |
| **17: Name Generator** | 8017 | Creative run names | ✅ Implemented |
| **18: Streak Calculator** | 8018 | Streak tracking, milestone predictions | ✅ Implemented |
| **19: Credit Optimizer** | 8019 | Optimize credit earning routes | ✅ Implemented |

**Status:** 13 of 20 services implemented and production-ready

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend/python-services
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file in `backend/python-services/`:

```env
DATABASE_URL=postgresql://user:password@localhost/runni5
REDIS_URL=redis://localhost:6379
```

### 3. Start All Services

**Option A: Python Script (Cross-platform)**
```bash
python start_services.py
```

**Option B: PowerShell (Windows)**
```powershell
.\start_services.ps1
```

**Option C: Manual (for debugging individual services)**
```bash
cd 01-run-statistics
python main.py
```

### 4. Verify Services Are Running

```bash
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
```

You should see: `{"status": "healthy", "service": "...", "port": ...}`

## 🔌 Integration with Node.js API Gateway

All Python services are accessed through the Node.js API gateway:

```
Frontend → http://localhost:4000/python/{service}/{endpoint}
           ↓
Node.js API Gateway (proxies request)
           ↓
Python Service → http://localhost:{port}/{endpoint}
```

**Example:**
```javascript
// Frontend calls:
POST http://localhost:4000/python/stats/stats/run-analysis

// Gateway proxies to:
POST http://localhost:8001/stats/run-analysis
```

## 📚 API Examples

### Service 01: Run Statistics

```bash
# Get run statistics for last 30 days
curl -X POST http://localhost:4000/python/stats/stats/run-analysis \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123", "time_period": "30"}'

# Response:
{
  "success": true,
  "data": {
    "total_runs": 15,
    "total_distance_km": 78.5,
    "avg_pace": "5:30",
    "avg_speed_kmh": 10.9,
    "total_calories": 5495,
    "runs_per_week": 3.5
  }
}
```

### Service 03: Engagement Score

```bash
# Calculate engagement score (0-100)
curl -X POST http://localhost:4000/python/engagement/engagement/calculate-score \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123"}'

# Response:
{
  "success": true,
  "data": {
    "score": 75,
    "level": "Active",
    "components": {
      "frequency": 25,
      "distance": 20,
      "recency": 20,
      "consistency": 10
    }
  }
}
```

### Service 11: Badge Generator

```bash
# Generate achievement badge (returns base64 PNG)
curl -X POST http://localhost:4000/python/badges/badges/achievement \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "JohnDoe",
    "achievement_type": "distance",
    "achievement_value": "100 km",
    "color_scheme": "gold"
  }'

# Or get direct image URL:
http://localhost:4000/python/badges/badges/achievement-image?user_name=JohnDoe&achievement_type=distance&achievement_value=100km&color_scheme=gold
```

### Service 18: Streak Calculator

```bash
# Check current streak
curl -X POST http://localhost:4000/python/streak/streak/calculate \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123"}'

# Response:
{
  "success": true,
  "data": {
    "current_streak": 7,
    "status": "Active",
    "days_active": 45,
    "last_run_date": "2026-03-08"
  }
}
```

## 🎨 Frontend Components

Pre-built React components are available in `frontend/components/python-features/`:

```tsx
import RunStatsCard from '@/components/python-features/RunStatsCard';
import EngagementScoreWidget from '@/components/python-features/EngagementScoreWidget';
import StreakDisplay from '@/components/python-features/StreakDisplay';

// Usage:
<RunStatsCard userId="user123" timePeriod="30" />
<EngagementScoreWidget userId="user123" />
<StreakDisplay userId="user123" />
```

## 🧪 Testing

```bash
# Test individual service
curl http://localhost:8001/health

# Test through API gateway
curl http://localhost:4000/python/stats/health

# Load test (requires Apache Bench)
ab -n 1000 -c 10 http://localhost:8001/health
```

## 🐛 Troubleshooting

### Service won't start
```bash
# Check if port is in use
netstat -an | grep 8001

# Check Python version (requires 3.8+)
python --version

# Check dependencies
pip list | grep fastapi
```

### Database connection errors
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL  # Linux/Mac
echo %DATABASE_URL%  # Windows CMD
$env:DATABASE_URL   # Windows PowerShell

# Test PostgreSQL connection
psql $DATABASE_URL
```

### Gateway proxy errors (503)
- Ensure Python services are running: `curl http://localhost:8001/health`
- Check Node.js is running: `curl http://localhost:4000/health`
- Verify axios is installed: `npm list axios`

## 📈 Resource Usage

**Per Service:**
- Memory: ~50MB
- CPU: <1% idle, 5-10% under load
- Startup time: <2 seconds

**All 7 Services:**
- Total Memory: ~350MB
- Total CPU: <10% average
- Perfect for free tier hosting (Render, Railway, Fly.io)

## 🔧 Development

### Add a new endpoint to existing service

```python
# In any service's main.py:

@app.post("/new-endpoint")
async def new_feature(req: SomeRequest):
    try:
        # Your logic here
        result = process_data(req)
        return formatter.success(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Create a new service

1. Copy template:
```bash
cp -r 01-run-statistics 20-new-service
```

2. Update `main.py`:
   - Change app title
   - Change port in `uvicorn.run()`
   - Add your endpoints

3. Add to gateway in `backend/api-gateway/index.js`:
```javascript
const PYTHON_SERVICES = {
  // ...existing
  'newservice': 8020,
};
```

4. Start service:
```bash
cd 20-new-service
python main.py
```

## 🚢 Deployment

### Render/Railway (Free Tier)

Create `render.yaml` or `railway.toml` for each service:

```yaml
services:
  - type: web
    name: python-stats
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: cd 01-run-statistics && python main.py
    envVars:
      - key: DATABASE_URL
        fromDatabase: main-db
      - key: REDIS_URL
        value: redis://red-xxxxx:6379
```

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ ./shared/
COPY 01-run-statistics/ ./01-run-statistics/

CMD ["python", "01-run-statistics/main.py"]
```

## 📊 Monitoring

```bash
# Check service health
curl http://localhost:8001/health

# Monitor logs
tail -f logs/python-stats.log

# Check Redis cache
redis-cli
> KEYS python:*
> GET python:stats:user123:30
```

## 🔒 Security Notes

- All services run on localhost by default (not exposed externally)
- Access controlled through Node.js API gateway
- Add authentication middleware to gateway for production
- Use rate limiting (already included in gateway)

## 📝 Next Steps

To implement the remaining 13 services:

1. **Service 04-10**: Geospatial features (route optimizer, heatmaps, elevation)
2. **Service 12-16**: Computer vision (badges, visualizations, QR codes)
3. **Service 20**: AI features (NLP chat, recommendations)

See `LIGHTWEIGHT_PYTHON_SERVICES.md` for full service descriptions.

## 💡 Tips

- **Cache aggressively**: All services use Redis with 15-60min TTL
- **Fail gracefully**: Frontend shows fallback UI if Python services are down
- **Start incrementally**: Deploy 2-3 services at a time
- **Monitor memory**: Each service should stay under 100MB

## 🤝 Contributing

1. Keep services lightweight (no GPU dependencies)
2. Use free APIs only
3. Add caching for expensive operations
4. Document all endpoints
5. Test with real data

---

Built with ❤️ using FastAPI, NumPy, Pillow, H3, and scikit-learn
