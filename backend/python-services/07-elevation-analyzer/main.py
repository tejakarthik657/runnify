"""
Elevation Analyzer - Calculate elevation gain and terrain difficulty
Port: 8007
Service 07 in the 20-service architecture
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
import json
import math

# Shared imports
import sys
sys.path.insert(0, '../shared')
from utils import db, cache, formatter

app = FastAPI(title="Elevation Analyzer", version="1.0.0")

class RunElevationRequest(BaseModel):
    run_id: str

class UserElevationRequest(BaseModel):
    user_id: str
    time_period: str = "30"  # days

class TrackElevationRequest(BaseModel):
    lat_lng_trace: list  # [(lat, lng, elevation), ...]

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "elevation-analyzer", "port": 8007}

@app.post("/elevation/analyze-run")
async def analyze_run_elevation(req: RunElevationRequest):
    """Calculate elevation metrics for a specific run"""
    try:
        cache_key = f"elevation:run:{req.run_id}:1h"
        cached = cache.get(cache_key)
        if cached:
            return formatter.format_response(success=True, data=json.loads(cached))

        # Fetch run trace points
        trace = db.fetch(
            """SELECT latitude, longitude, elevation FROM run_trace_points 
               WHERE run_id = %s 
               ORDER BY created_at ASC""",
            (req.run_id,)
        )

        if not trace or len(trace) < 2:
            return formatter.format_response(
                success=True,
                data={
                    "elevation_gain": 0,
                    "elevation_loss": 0,
                    "max_elevation": 0,
                    "min_elevation": 0,
                    "terrain_difficulty": "flat",
                    "avg_grade": 0
                }
            )

        # Calculate elevation metrics
        elevations = [float(t.get('elevation', 0)) for t in trace]
        elevations = [e for e in elevations if e > 0]  # filter out invalid
        
        if not elevations:
            return formatter.format_response(
                success=True,
                data={
                    "elevation_gain": 0,
                    "elevation_loss": 0,
                    "max_elevation": 0,
                    "min_elevation": 0,
                    "terrain_difficulty": "flat",
                    "avg_grade": 0
                }
            )

        gain = 0
        loss = 0
        for i in range(1, len(elevations)):
            delta = elevations[i] - elevations[i-1]
            if delta > 0:
                gain += delta
            else:
                loss += abs(delta)

        # Calculate grade (elevation / distance)
        distance_m = _calculate_distance_from_trace(trace)
        avg_grade = (gain / distance_m * 100) if distance_m > 0 else 0

        # Determine terrain difficulty
        difficulty = _classify_terrain(gain, distance_m)

        result = {
            "elevation_gain": round(gain, 1),
            "elevation_loss": round(loss, 1),
            "max_elevation": round(max(elevations), 1),
            "min_elevation": round(min(elevations), 1),
            "avg_grade": round(avg_grade, 2),
            "terrain_difficulty": difficulty,
            "calories_bonus": round(gain * 0.5)  # approximate: 0.5 cal per meter climbed
        }

        cache.set(cache_key, json.dumps(result), ttl=3600)
        return formatter.format_response(success=True, data=result)

    except Exception as e:
        return formatter.format_response(success=False, error=str(e), status_code=500)

@app.post("/elevation/user-stats")
async def get_user_elevation_stats(req: UserElevationRequest):
    """Get aggregated elevation stats for a user over time period"""
    try:
        cache_key = f"elevation:user:{req.user_id}:{req.time_period}d:1h"
        cached = cache.get(cache_key)
        if cached:
            return formatter.format_response(success=True, data=json.loads(cached))

        days = int(req.time_period)
        cutoff_date = datetime.now() - timedelta(days=days)

        # Fetch user's runs with elevation data
        runs = db.fetch(
            """SELECT r.id, r.distance_km, r.start_distance_km FROM runs r
               WHERE r.user_id = %s AND r.created_at >= %s
               ORDER BY r.created_at DESC""",
            (req.user_id, cutoff_date)
        )

        if not runs:
            return formatter.format_response(
                success=True,
                data={
                    "total_elevation_gain": 0,
                    "total_elevation_loss": 0,
                    "runs_count": 0,
                    "avg_elevation_gain": 0,
                    "elevation_per_km": 0,
                    "hardest_run": None,
                    "elevation_category": "flat-runner"
                }
            )

        # Analyze elevation for each run
        total_gain = 0
        total_loss = 0
        run_elevations = []

        for run in runs:
            trace = db.fetch(
                """SELECT elevation FROM run_trace_points 
                   WHERE run_id = %s 
                   ORDER BY created_at ASC""",
                (run['id'],)
            )
            
            if trace and len(trace) > 1:
                elevations = [float(t.get('elevation', 0)) for t in trace if t.get('elevation', 0) > 0]
                if elevations:
                    gain = sum(max(0, elevations[i] - elevations[i-1]) for i in range(1, len(elevations)))
                    loss = sum(max(0, elevations[i-1] - elevations[i]) for i in range(1, len(elevations)))
                    
                    total_gain += gain
                    total_loss += loss
                    run_elevations.append({
                        "run_id": run['id'],
                        "gain": gain,
                        "distance_km": run['distance_km']
                    })

        total_distance = sum(r['distance_km'] for r in runs)
        avg_gain = total_gain / len(run_elevations) if run_elevations else 0

        # Find hardest run
        hardest = max(run_elevations, key=lambda x: x['gain']) if run_elevations else None

        # Categorize user
        category = _categorize_elevation_preference(total_gain, total_distance, len(runs))

        result = {
            "time_period_days": days,
            "runs_count": len(runs),
            "total_elevation_gain": round(total_gain, 1),
            "total_elevation_loss": round(total_loss, 1),
            "avg_elevation_gain": round(avg_gain, 1),
            "elevation_per_km": round(total_gain / total_distance, 2) if total_distance > 0 else 0,
            "hardest_run": hardest,
            "elevation_category": category,
            "elevation_badge": _get_elevation_badge(total_gain)
        }

        cache.set(cache_key, json.dumps(result), ttl=3600)
        return formatter.format_response(success=True, data=result)

    except Exception as e:
        return formatter.format_response(success=False, error=str(e), status_code=500)

@app.post("/elevation/trace-analysis")
async def analyze_trace_elevation(req: TrackElevationRequest):
    """Analyze elevation for a raw GPS trace"""
    try:
        elevations = [float(e[2]) for e in req.lat_lng_trace if len(e) > 2 and e[2] > 0]

        if not elevations or len(elevations) < 2:
            return formatter.format_response(
                success=True,
                data={
                    "elevation_gain": 0,
                    "elevation_loss": 0,
                    "difficulty": "flat"
                }
            )

        gain = sum(max(0, elevations[i] - elevations[i-1]) for i in range(1, len(elevations)))
        loss = sum(max(0, elevations[i-1] - elevations[i]) for i in range(1, len(elevations)))

        difficulty = _classify_terrain(gain, 1000)  # assume ~1km for quick analysis

        result = {
            "elevation_gain": round(gain, 1),
            "elevation_loss": round(loss, 1),
            "difficulty": difficulty,
            "points_bonus": round(gain * 0.1)  # bonus points for elevation
        }

        return formatter.format_response(success=True, data=result)

    except Exception as e:
        return formatter.format_response(success=False, error=str(e), status_code=500)

def _calculate_distance_from_trace(trace):
    """Calculate total distance from GPS trace using haversine"""
    from math import radians, cos, sin, asin, sqrt
    
    distance = 0
    for i in range(1, len(trace)):
        lat1, lng1 = float(trace[i-1]['latitude']), float(trace[i-1]['longitude'])
        lat2, lng2 = float(trace[i]['latitude']), float(trace[i]['longitude'])
        
        dlat = radians(lat2 - lat1)
        dlng = radians(lng2 - lng1)
        
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        distance += c * 6371  # Earth radius in km
    
    return distance * 1000  # return in meters

def _classify_terrain(elevation_gain, distance_m):
    """Classify terrain difficulty based on elevation"""
    grade = (elevation_gain / distance_m * 100) if distance_m > 0 else 0
    
    if grade < 1:
        return "flat"
    elif grade < 3:
        return "rolling"
    elif grade < 6:
        return "hilly"
    elif grade < 10:
        return "mountainous"
    else:
        return "extreme"

def _categorize_elevation_preference(total_gain, total_distance, run_count):
    """Categorize user's elevation preference"""
    if run_count == 0:
        return "unknown"
    
    avg_grade = (total_gain / total_distance * 100) if total_distance > 0 else 0
    
    if avg_grade > 5:
        return "hill-seeker"
    elif avg_grade > 2:
        return "mountaineer"
    elif avg_grade > 0.5:
        return "elevation-aware"
    else:
        return "flat-runner"

def _get_elevation_badge(total_gain):
    """Get elevation achievement badge"""
    if total_gain >= 5000:
        return {"name": "Sky Chaser", "emoji": "mountain"}
    elif total_gain >= 2000:
        return {"name": "Hill Climber", "emoji": "peak"}
    elif total_gain >= 500:
        return {"name": "Elevation Explorer", "emoji": "trail"}
    else:
        return {"name": "Flat Runner", "emoji": "run"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007)
