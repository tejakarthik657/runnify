# Service 18: Streak Calculator
# Port: 8018
# Tech: Python datetime, Pandas
# Purpose: Calculate streaks, predict milestones, recovery suggestions

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Dict
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.utils import db, cache, formatter

app = FastAPI(title="Streak Calculator", version="1.0.0")

class StreakRequest(BaseModel):
    user_id: str

class MilestoneRequest(BaseModel):
    user_id: str
    current_streak: int

class HistoryRequest(BaseModel):
    user_id: str
    days: int = 90


def calculate_current_streak(user_id: str) -> Dict:
    """Calculate user's current running streak"""
    # Get all run dates
    query = """
        SELECT DISTINCT DATE(created_at) as run_date
        FROM runs
        WHERE user_id = %s
        ORDER BY run_date DESC
        LIMIT 365
    """
    results = db.execute_query(query, (user_id,))
    
    if not results:
        return {
            "current_streak": 0,
            "streak_start_date": None,
            "days_active": 0,
            "status": "No activity"
        }
    
    run_dates = [r['run_date'] for r in results]
    today = datetime.now().date()
    
    # Check if ran today or yesterday (streak is still active)
    last_run = run_dates[0]
    days_since_last = (today - last_run).days
    
    if days_since_last > 1:
        # Streak broken
        return {
            "current_streak": 0,
            "streak_start_date": None,
            "days_active": len(run_dates),
            "status": "Streak broken",
            "last_run_date": last_run.isoformat(),
            "days_since_last_run": days_since_last
        }
    
    # Calculate streak
    streak_count = 0
    current_date = today if days_since_last == 0 else today - timedelta(days=1)
    
    for run_date in run_dates:
        if run_date == current_date:
            streak_count += 1
            current_date -= timedelta(days=1)
        elif (current_date - run_date).days > 1:
            # Gap found, streak ends here
            break
    
    streak_start = current_date + timedelta(days=1)
    
    return {
        "current_streak": streak_count,
        "streak_start_date": streak_start.isoformat(),
        "days_active": len(run_dates),
        "status": "Active",
        "last_run_date": last_run.isoformat(),
        "days_since_last_run": days_since_last
    }


def predict_next_milestone(current_streak: int) -> Dict:
    """Predict next streak milestone"""
    milestones = [3, 7, 14, 30, 50, 100, 200, 365]
    
    # Find next milestone
    next_milestone = None
    for milestone in milestones:
        if milestone > current_streak:
            next_milestone = milestone
            break
    
    if not next_milestone:
        next_milestone = ((current_streak // 100) + 1) * 100
    
    days_until_milestone = next_milestone - current_streak
    estimated_date = datetime.now() + timedelta(days=days_until_milestone)
    
    # Milestone rewards
    milestone_rewards = {
        3: {"name": "Getting Started", "credits": 50},
        7: {"name": "Week Warrior", "credits": 100},
        14: {"name": "Two Week Champion", "credits": 200},
        30: {"name": "Monthly Master", "credits": 500},
        50: {"name": "Consistency King", "credits": 1000},
        100: {"name": "Century Club", "credits": 2500},
        200: {"name": "Elite Streaker", "credits": 5000},
        365: {"name": "Year-Long Legend", "credits": 10000}
    }
    
    reward_info = milestone_rewards.get(next_milestone, {
        "name": f"{next_milestone}-Day Streak",
        "credits": next_milestone * 10
    })
    
    return {
        "current_streak": current_streak,
        "next_milestone": next_milestone,
        "days_until_milestone": days_until_milestone,
        "estimated_date": estimated_date.strftime("%Y-%m-%d"),
        "milestone_name": reward_info["name"],
        "reward_credits": reward_info["credits"]
    }


def analyze_streak_history(user_id: str, days: int) -> Dict:
    """Analyze historical streak patterns"""
    query = """
        SELECT DISTINCT DATE(created_at) as run_date
        FROM runs
        WHERE user_id = %s
        AND created_at >= NOW() - INTERVAL '%s days'
        ORDER BY run_date ASC
    """
    results = db.execute_query(query, (user_id, days))
    
    if not results:
        return {
            "total_active_days": 0,
            "longest_streak": 0,
            "average_gap_days": 0,
            "consistency_score": 0
        }
    
    run_dates = [r['run_date'] for r in results]
    
    # Calculate all streaks
    streaks = []
    current_streak = 1
    
    for i in range(1, len(run_dates)):
        gap = (run_dates[i] - run_dates[i-1]).days
        
        if gap == 1:
            current_streak += 1
        else:
            streaks.append(current_streak)
            current_streak = 1
    
    streaks.append(current_streak)
    
    # Calculate gaps
    gaps = []
    for i in range(1, len(run_dates)):
        gap = (run_dates[i] - run_dates[i-1]).days
        if gap > 1:
            gaps.append(gap - 1)
    
    # Consistency score (0-100)
    consistency = (len(run_dates) / days) * 100
    
    return {
        "total_active_days": len(run_dates),
        "longest_streak": max(streaks) if streaks else 0,
        "average_streak_length": round(sum(streaks) / len(streaks), 1) if streaks else 0,
        "total_streaks": len(streaks),
        "average_gap_days": round(sum(gaps) / len(gaps), 1) if gaps else 0,
        "consistency_score": round(consistency, 1),
        "analysis_period_days": days
    }


def get_recovery_suggestions(days_since_last_run: int, longest_streak: int) -> List[str]:
    """Get suggestions for recovering broken streak"""
    suggestions = []
    
    if days_since_last_run <= 1:
        suggestions.append("Keep the momentum going! You're on track.")
    elif days_since_last_run <= 3:
        suggestions.append("It's been a few days. A short run today can restart your streak!")
    else:
        suggestions.append("Don't worry about the gap. Start fresh today!")
    
    if longest_streak > 7:
        suggestions.append(f"You had a {longest_streak}-day streak before. You can do it again!")
    
    suggestions.append("Set a small goal: commit to just 3 days in a row.")
    suggestions.append("Run with a friend for extra motivation.")
    
    return suggestions


# API Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "streak-calculator", "port": 8018}


@app.post("/streak/calculate")
async def calculate_streak(req: StreakRequest):
    """Calculate current streak"""
    try:
        cache_key = f"streak:{req.user_id}"
        cached = cache.get(cache_key)
        if cached:
            return formatter.success(cached)
        
        streak_data = calculate_current_streak(req.user_id)
        
        # Cache for 1 hour
        cache.set(cache_key, streak_data, ttl=3600)
        
        return formatter.success(streak_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/streak/predict-milestone")
async def predict_milestone(req: MilestoneRequest):
    """Predict next milestone"""
    try:
        milestone = predict_next_milestone(req.current_streak)
        return formatter.success(milestone)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/streak/history")
async def get_streak_history(req: HistoryRequest):
    """Get streak history and analysis"""
    try:
        history = analyze_streak_history(req.user_id, req.days)
        
        # Get current streak
        current = calculate_current_streak(req.user_id)
        
        # Add recovery suggestions if needed
        if current['status'] == "Streak broken":
            suggestions = get_recovery_suggestions(
                current.get('days_since_last_run', 0),
                history['longest_streak']
            )
            history['recovery_suggestions'] = suggestions
        
        return formatter.success(history)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8018)
