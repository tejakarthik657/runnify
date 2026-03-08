# Service 03: Engagement Score Engine
# Port: 8003
# Tech: scikit-learn (simple models)
# Purpose: Calculate engagement, predict churn, analyze patterns

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict
from datetime import datetime, timedelta
import sys
import os
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.utils import db, cache, formatter

app = FastAPI(title="Engagement Score Engine", version="1.0.0")

class EngagementRequest(BaseModel):
    user_id: str

class ChurnRequest(BaseModel):
    user_id: str

class PatternRequest(BaseModel):
    user_id: str
    days: int = 30


def calculate_engagement_score(user_id: str) -> Dict:
    """Calculate 0-100 engagement score"""
    # Get recent activity (last 30 days)
    query = """
        SELECT 
            COUNT(*) as run_count,
            SUM(distance_km) as total_distance,
            MAX(created_at) as last_run,
            COUNT(DISTINCT DATE(created_at)) as active_days
        FROM runs
        WHERE user_id = %s
        AND created_at >= NOW() - INTERVAL '30 days'
    """
    result = db.execute_query(query, (user_id,))
    
    if not result or result[0]['run_count'] == 0:
        return {
            "score": 0,
            "level": "Inactive",
            "components": {
                "frequency": 0,
                "distance": 0,
                "recency": 0,
                "consistency": 0
            }
        }
    
    data = result[0]
    
    # Component 1: Frequency (max 30 points)
    # 0-5 runs = 0-10, 6-10 = 11-20, 10+ = 21-30
    run_count = data['run_count']
    if run_count >= 15:
        frequency_score = 30
    elif run_count >= 10:
        frequency_score = 25
    elif run_count >= 6:
        frequency_score = 20
    elif run_count >= 3:
        frequency_score = 15
    else:
        frequency_score = run_count * 5
    
    # Component 2: Distance (max 25 points)
    total_distance = data['total_distance'] or 0
    if total_distance >= 100:
        distance_score = 25
    elif total_distance >= 50:
        distance_score = 20
    elif total_distance >= 25:
        distance_score = 15
    else:
        distance_score = min(int(total_distance / 2), 25)
    
    # Component 3: Recency (max 25 points)
    days_since_last_run = (datetime.utcnow() - data['last_run']).days
    if days_since_last_run == 0:
        recency_score = 25
    elif days_since_last_run <= 2:
        recency_score = 20
    elif days_since_last_run <= 7:
        recency_score = 15
    elif days_since_last_run <= 14:
        recency_score = 10
    else:
        recency_score = max(0, 25 - days_since_last_run)
    
    # Component 4: Consistency (max 20 points)
    active_days = data['active_days']
    consistency_ratio = active_days / 30
    consistency_score = int(consistency_ratio * 20)
    
    # Total score
    total_score = frequency_score + distance_score + recency_score + consistency_score
    
    # Determine level
    if total_score >= 80:
        level = "Elite"
    elif total_score >= 60:
        level = "Active"
    elif total_score >= 40:
        level = "Moderate"
    elif total_score >= 20:
        level = "Casual"
    else:
        level = "At Risk"
    
    return {
        "score": total_score,
        "level": level,
        "components": {
            "frequency": frequency_score,
            "distance": distance_score,
            "recency": recency_score,
            "consistency": consistency_score
        },
        "days_since_last_run": days_since_last_run,
        "runs_this_month": run_count
    }


def predict_churn_risk(user_id: str) -> Dict:
    """Predict churn probability using simple heuristics"""
    # Get user data
    query = """
        SELECT 
            COUNT(*) as total_runs,
            MAX(created_at) as last_run,
            MIN(created_at) as first_run
        FROM runs
        WHERE user_id = %s
    """
    result = db.execute_query(query, (user_id,))
    
    if not result or result[0]['total_runs'] == 0:
        return {
            "churn_probability": 1.0,
            "risk_level": "high",
            "factors": ["No activity detected"]
        }
    
    data = result[0]
    
    # Calculate factors
    days_since_last_run = (datetime.utcnow() - data['last_run']).days
    account_age_days = (datetime.utcnow() - data['first_run']).days
    total_runs = data['total_runs']
    
    # Simple scoring
    risk_score = 0
    factors = []
    
    if days_since_last_run > 14:
        risk_score += 0.4
        factors.append(f"Inactive for {days_since_last_run} days")
    elif days_since_last_run > 7:
        risk_score += 0.2
        factors.append(f"No runs in {days_since_last_run} days")
    
    if total_runs < 5:
        risk_score += 0.3
        factors.append("Low total activity")
    
    if account_age_days > 30 and total_runs < 10:
        risk_score += 0.2
        factors.append("Low engagement over time")
    
    # Get engagement score
    engagement = calculate_engagement_score(user_id)
    if engagement['score'] < 40:
        risk_score += 0.1
        factors.append("Low engagement score")
    
    # Determine risk level
    if risk_score >= 0.6:
        risk_level = "high"
    elif risk_score >= 0.3:
        risk_level = "medium"
    else:
        risk_level = "low"
    
    return {
        "churn_probability": min(risk_score, 1.0),
        "risk_level": risk_level,
        "factors": factors if factors else ["User active and engaged"],
        "days_since_last_run": days_since_last_run,
        "suggested_action": "Send re-engagement notification" if risk_level in ["medium", "high"] else "No action needed"
    }


def analyze_activity_patterns(user_id: str, days: int) -> Dict:
    """Analyze user activity patterns"""
    query = """
        SELECT 
            EXTRACT(DOW FROM created_at) as day_of_week,
            EXTRACT(HOUR FROM created_at) as hour_of_day,
            COUNT(*) as run_count
        FROM runs
        WHERE user_id = %s
        AND created_at >= NOW() - INTERVAL '%s days'
        GROUP BY day_of_week, hour_of_day
        ORDER BY run_count DESC
    """
    results = db.execute_query(query, (user_id, days))
    
    if not results:
        return {
            "favorite_day": "No data",
            "favorite_hour": "No data",
            "pattern": "Insufficient data"
        }
    
    # Most common day (0=Sunday, 6=Saturday)
    days_map = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    day_counts = {}
    hour_counts = {}
    
    for row in results:
        day = int(row['day_of_week'])
        hour = int(row['hour_of_day'])
        count = row['run_count']
        
        day_counts[day] = day_counts.get(day, 0) + count
        hour_counts[hour] = hour_counts.get(hour, 0) + count
    
    favorite_day = days_map[max(day_counts, key=day_counts.get)] if day_counts else "No data"
    favorite_hour = max(hour_counts, key=hour_counts.get) if hour_counts else 0
    
    # Determine pattern
    if hour_counts.get(6, 0) + hour_counts.get(7, 0) > sum(hour_counts.values()) * 0.5:
        pattern = "Early Morning Runner"
    elif hour_counts.get(17, 0) + hour_counts.get(18, 0) > sum(hour_counts.values()) * 0.5:
        pattern = "Evening Runner"
    else:
        pattern = "Flexible Schedule"
    
    return {
        "favorite_day": favorite_day,
        "favorite_hour": f"{favorite_hour}:00",
        "pattern": pattern,
        "total_runs_analyzed": len(results)
    }


# API Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "engagement-score-engine", "port": 8003}


@app.post("/engagement/calculate-score")
async def get_engagement_score(req: EngagementRequest):
    """Calculate engagement score"""
    try:
        cache_key = f"engagement:{req.user_id}"
        cached = cache.get(cache_key)
        if cached:
            return formatter.success(cached)
        
        score = calculate_engagement_score(req.user_id)
        cache.set(cache_key, score, ttl=3600)
        
        return formatter.success(score)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/engagement/churn-risk")
async def get_churn_risk(req: ChurnRequest):
    """Predict churn probability"""
    try:
        risk = predict_churn_risk(req.user_id)
        return formatter.success(risk)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/engagement/pattern-analysis")
async def analyze_patterns(req: PatternRequest):
    """Analyze activity patterns"""
    try:
        patterns = analyze_activity_patterns(req.user_id, req.days)
        return formatter.success(patterns)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
