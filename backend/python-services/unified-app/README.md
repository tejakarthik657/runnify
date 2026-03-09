# Unified Python Services

Single FastAPI application that combines all 13 Python microservices.

## Architecture

Instead of running 13 separate services, this unified app:
1. Imports each service module dynamically
2. Mounts each service's app at its route prefix (e.g., `/stats`, `/territory`, `/elevation`)
3. Runs as a single process on one port (8000)

## Benefits

- **One Render deployment** instead of 13 separate instances
- **Shared resource pool** (memory, CPU) across all services
- **Simplified configuration** - only 2 env vars needed (DATABASE_URL, REDIS_URL)
- **Faster cold starts** - single container warmup instead of 13
- **Same API contract** - routes remain `/python/:service/*path` from gateway

## Local Development

```bash
cd backend/python-services/unified-app
pip install -r requirements.txt
python start.py
```

Visit http://localhost:8000/docs to see all mounted services.

## Deployment (Render)

1. Create one Python web service: `territory-run-python`
2. Root Directory: `backend/python-services/unified-app`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Set env vars:
   - `DATABASE_URL=<your MongoDB URI>`
   - `REDIS_URL=<your Redis URL>`

## Service Routing

All services mounted at their prefix:
- `/stats/*` → 01-run-statistics
- `/hex/*` → 02-hex-analyzer
- `/engagement/*` → 03-engagement-engine
- `/leaderboard/*` → 04-leaderboard-predictor
- `/territory/*` → 05-territory-analyzer
- `/routes/*` → 06-route-optimization
- `/elevation/*` → 07-elevation-analyzer
- `/heatmap/*` → 08-heatmap-generator
- `/badges/*` → 11-badge-generator
- `/challenges/*` → 16-challenge-recommender
- `/names/*` → 17-run-name-generator
- `/streak/*` → 18-streak-calculator
- `/credits/*` → 19-credit-optimizer

Gateway proxies `/python/:service/*path` to `PYTHON_SERVICE_URL/:service/*path`.
