# Service 01: Run Statistics Calculator
# Port: 8001
# Tech: NumPy, Pandas (no ML)
# Purpose: Calculate pace, speed trends, personal records, calorie estimation

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path for shared imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.utils import db, cache, formatter, calculate_pace, estimate_calories

app = FastAPI(title="Run Statistics Calculator", version="1.0.0")

# Request Models
class RunAnalysisRequest(BaseModel):
    user_id: str
    time_period: str = "30"  # days

class PersonalRecordRequest(BaseModel):
    user_id: str
    run_id: Optional[str] = None

class SummaryRequest(BaseModel):
    user_id: str
    period: str = "week"  # week or month

# Helper Functions
def calculate_run_statistics(runs: List[Dict]) -> Dict:
    """Calculate comprehensive run statistics"""
    if not runs:
        return {
            "total_runs": 0,
            "total_distance_km": 0,
            "total_time_seconds": 0,
            "avg_distance_km": 0,
            "avg_pace": "0:00",
            "avg_speed_kmh": 0,
            "total_calories": 0
        }
    
    import numpy as np
    
    distances = [r['distance_km'] for r in runs]
    times = [r['duration_seconds'] for r in runs]
    
    total_distance = sum(distances)
    total_time = sum(times)
    avg_distance = np.mean(distances)
    
    # Calculate average pace
    avg_pace = calculate_pace(total_distance, total_time)
    
    # Calculate average speed (km/h)
    avg_speed = (total_distance / (total_time / 3600)) if total_time > 0 else 0
    
    # Estimate total calories
    total_calories = sum([estimate_calories(d) for d in distances])
    
    return {
        "total_runs": len(runs),
        "total_distance_km": round(total_distance, 2),
        "total_time_seconds": total_time,
        "avg_distance_km": round(avg_distance, 2),
        "avg_pace": avg_pace,
        "avg_speed_kmh": round(avg_speed, 2),
        "total_calories": total_calories,
        "best_distance": round(max(distances), 2),
        "longest_run_time": max(times)
    }


def detect_personal_records(user_id: str, current_run: Dict = None) -> Dict:
    """Detect if current run breaks any personal records"""
    # Get all user runs
    query = """
        SELECT distance_km, duration_seconds, created_at
        FROM runs
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 100
    """
    runs = db.execute_query(query, (user_id,))
    
    if not runs:
        return {"has_pr": False, "records": []}
    
    records = []
    
    # Check distance PR
    if current_run:
        distances = [r['distance_km'] for r in runs[1:]]  # Exclude current
        if not distances or current_run['distance_km'] > max(distances):
            records.append({
                "type": "longest_distance",
                "value": current_run['distance_km'],
                "previous": max(distances) if distances else 0
            })
        
        # Check fastest pace for 5K
        current_pace = current_run['duration_seconds'] / current_run['distance_km']
        compatible_runs = [r for r in runs[1:] if 4.5 <= r['distance_km'] <= 5.5]
        if compatible_runs:
            best_prev_pace = min([r['duration_seconds'] / r['distance_km'] for r in compatible_runs])
            if current_pace < best_prev_pace:
                records.append({
                    "type": "fastest_5k_pace",
                    "value": calculate_pace(5, int(current_pace * 5)),
                    "previous": calculate_pace(5, int(best_prev_pace * 5))
                })
    
    return {
        "has_pr": len(records) > 0,
        "records": records,
        "total_prs": len(records)
    }


def generate_weekly_summary(user_id: str) -> Dict:
    """Generate weekly run summary"""
    # Get runs from last 7 days
    query = """
        SELECT 
            distance_km, 
            duration_seconds, 
            hexes_captured,
            credits_earned,
            created_at
        FROM runs
        WHERE user_id = %s
        AND created_at >= NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
    """
    runs = db.execute_query(query, (user_id,))
    
    if not runs:
        return {
            "period": "This Week",
            "runs_completed": 0,
            "total_distance_km": 0,
            "total_hexes": 0,
            "total_credits": 0,
            "avg_per_run": {}
        }
    
    stats = calculate_run_statistics(runs)
    
    return {
        "period": "This Week",
        "runs_completed": len(runs),
        "total_distance_km": stats['total_distance_km'],
        "total_hexes": sum([r.get('hexes_captured', 0) for r in runs]),
        "total_credits": sum([r.get('credits_earned', 0) for r in runs]),
        "avg_per_run": {
            "distance_km": round(stats['avg_distance_km'], 2),
            "pace": stats['avg_pace'],
            "hexes": round(sum([r.get('hexes_captured', 0) for r in runs]) / len(runs), 1),
            "credits": round(sum([r.get('credits_earned', 0) for r in runs]) / len(runs), 1)
        },
        "comparison_vs_last_week": "Coming soon"
    }


# API Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "run-statistics-calculator", "port": 8001}


@app.post("/stats/run-analysis")
async def analyze_runs(req: RunAnalysisRequest):
    """Analyze user's runs over a time period"""
    try:
        # Check cache
        cache_key = f"run_stats:{req.user_id}:{req.time_period}"
        cached = cache.get(cache_key)
        if cached:
            return formatter.success(cached, "Retrieved from cache")
        
        # Get runs from database
        query = """
            SELECT 
                id, distance_km, duration_seconds, 
                hexes_captured, credits_earned, created_at
            FROM runs
            WHERE user_id = %s
            AND created_at >= NOW() - INTERVAL '%s days'
            ORDER BY created_at DESC
        """
        runs = db.execute_query(query, (req.user_id, req.time_period))
        
        # Calculate statistics
        stats = calculate_run_statistics(runs)
        
        # Add time period context
        stats['time_period_days'] = int(req.time_period)
        stats['runs_per_week'] = round((stats['total_runs'] / int(req.time_period)) * 7, 1)
        
        # Cache for 1 hour
        cache.set(cache_key, stats, ttl=3600)
        
        return formatter.success(stats)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/stats/personal-records")
async def check_personal_records(req: PersonalRecordRequest):
    """Detect personal records"""
    try:
        current_run = None
        if req.run_id:
            query = "SELECT distance_km, duration_seconds FROM runs WHERE id = %s"
            result = db.execute_query(query, (req.run_id,))
            current_run = result[0] if result else None
        
        pr_data = detect_personal_records(req.user_id, current_run)
        
        return formatter.success(pr_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats/summary/{user_id}")
async def get_summary(user_id: str, period: str = "week"):
    """Get weekly or monthly summary"""
    try:
        # Check cache
        cache_key = f"summary:{user_id}:{period}"
        cached = cache.get(cache_key)
        if cached:
            return formatter.success(cached, "Retrieved from cache")
        
        if period == "week":
            summary = generate_weekly_summary(user_id)
        else:
            # Monthly summary (similar logic, 30 days)
            query = """
                SELECT distance_km, duration_seconds, hexes_captured, credits_earned
                FROM runs
                WHERE user_id = %s
                AND created_at >= NOW() - INTERVAL '30 days'
            """
            runs = db.execute_query(query, (user_id,))
            stats = calculate_run_statistics(runs)
            summary = {
                "period": "This Month",
                "runs_completed": len(runs),
                "total_distance_km": stats['total_distance_km'],
                "avg_pace": stats['avg_pace']
            }
        
        # Cache for 1 hour
        cache.set(cache_key, summary, ttl=3600)
        
        return formatter.success(summary)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
