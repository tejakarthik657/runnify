# Service 19: Credit Optimizer
# Port: 8019
# Tech: NumPy (optimization math)
# Purpose: Optimize credit earning, suggest high-value hexes, track goals

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime, time
import sys
import os
import h3

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.utils import db, cache, formatter, haversine_distance

app = FastAPI(title="Credit Optimizer", version="1.0.0")

class CreditRouteRequest(BaseModel):
    user_id: str
    start_location: Dict  # {"lat": float, "lng": float}
    target_distance_km: float
    current_hour: Optional[int] = None  # 0-23

class HighValueHexRequest(BaseModel):
    user_id: str
    current_location: Dict
    max_distance_km: float = 5.0

class GoalTrackingRequest(BaseModel):
    user_id: str
    goal_credits: int
    timeframe_days: int = 30


# Credit values
CREDIT_NEW_HEX = 10
CREDIT_INVADE_HEX = 25
PEAK_HOURS_MULTIPLIER = 1.5
PEAK_HOURS = [(7, 9), (17, 19)]  # 7-9am, 5-7pm


def is_peak_hour(hour: int) -> bool:
    """Check if hour is peak time for bonus"""
    for start, end in PEAK_HOURS:
        if start <= hour < end:
            return True
    return False


def calculate_potential_credits(hex_status: str, is_peak: bool = False) -> int:
    """Calculate credits for capturing a hex"""
    if hex_status == "unclaimed":
        base_credits = CREDIT_NEW_HEX
    elif hex_status == "enemy":
        base_credits = CREDIT_INVADE_HEX
    else:  # owned
        base_credits = 0
    
    if is_peak and base_credits > 0:
        base_credits = int(base_credits * PEAK_HOURS_MULTIPLIER)
    
    return base_credits


def find_high_value_hexes(user_id: str, start_lat: float, start_lng: float, max_distance_km: float) -> List[Dict]:
    """Find nearby high-value hexes"""
    # Get current user hexes
    query = "SELECT hex_id FROM territories WHERE owner_id = %s"
    user_hexes_result = db.execute_query(query, (user_id,))
    user_hexes = set([r['hex_id'] for r in user_hexes_result])
    
    # Get hexes in area
    start_hex = h3.latlng_to_cell(start_lat, start_lng, 9)
    
    # Calculate how many rings to check based on distance
    rings_to_check = min(int(max_distance_km / 0.5), 10)  # ~0.5km per ring
    
    high_value_hexes = []
    
    for ring in range(1, rings_to_check + 1):
        ring_hexes = h3.hex_ring(start_hex, ring)
        
        for hex_id in ring_hexes:
            # Skip if user already owns
            if hex_id in user_hexes:
                continue
            
            # Get hex location
            lat, lng = h3.cell_to_latlng(hex_id)
            
            # Calculate actual distance
            distance_km = haversine_distance(start_lat, start_lng, lat, lng)
            
            if distance_km > max_distance_km:
                continue
            
            # Check hex status
            query = "SELECT owner_id FROM territories WHERE hex_id = %s"
            result = db.execute_query(query, (hex_id,))
            
            if len(result) == 0:
                status = "unclaimed"
                credits = CREDIT_NEW_HEX
            else:
                status = "enemy"
                credits = CREDIT_INVADE_HEX
            
            # Calculate strategic value
            # Bonus for being close to user's territory
            neighbors = h3.hex_ring(hex_id, 1)
            adjacent_owned = sum(1 for n in neighbors if n in user_hexes)
            strategic_bonus = adjacent_owned * 2  # 2 bonus points per adjacent
            
            value_score = credits + strategic_bonus
            
            high_value_hexes.append({
                "hex_id": hex_id,
                "lat": lat,
                "lng": lng,
                "distance_km": round(distance_km, 2),
                "status": status,
                "base_credits": credits,
                "strategic_bonus": strategic_bonus,
                "total_value": value_score,
                "adjacent_owned_hexes": adjacent_owned
            })
    
    # Sort by value
    high_value_hexes.sort(key=lambda x: (-x['total_value'], x['distance_km']))
    
    return high_value_hexes[:20]  # Return top 20


def optimize_credit_route(user_id: str, start_loc: Dict, distance_km: float, current_hour: Optional[int]) -> Dict:
    """Generate route optimized for maximum credits"""
    is_peak = is_peak_hour(current_hour) if current_hour is not None else False
    
    # Find high-value hexes
    high_value = find_high_value_hexes(
        user_id,
        start_loc['lat'],
        start_loc['lng'],
        distance_km * 1.5  # Search wider area
    )
    
    # Estimate how many hexes can be captured
    avg_hex_size_km = 0.5  # Approximate
    estimated_hexes = int(distance_km / avg_hex_size_km)
    
    # Take top hexes that fit the route
    recommended_hexes = high_value[:estimated_hexes]
    
    # Calculate potential credits
    total_credits = sum([h['base_credits'] for h in recommended_hexes])
    
    if is_peak:
        total_credits = int(total_credits * PEAK_HOURS_MULTIPLIER)
    
    return {
        "recommended_hexes": recommended_hexes,
        "estimated_credits": total_credits,
        "estimated_hexes_captured": len(recommended_hexes),
        "is_peak_hour": is_peak,
        "peak_multiplier": PEAK_HOURS_MULTIPLIER if is_peak else 1.0,
        "route_strategy": "Prioritize enemy hexes" if any(h['status'] == 'enemy' for h in recommended_hexes) else "Expand into new territory"
    }


def calculate_goal_progress(user_id: str, goal_credits: int, timeframe_days: int) -> Dict:
    """Calculate progress towards credit goal"""
    # Get credits earned in timeframe
    query = """
        SELECT SUM(credits_earned) as total_credits,
               COUNT(*) as runs_count
        FROM runs
        WHERE user_id = %s
        AND created_at >= NOW() - INTERVAL '%s days'
    """
    result = db.execute_query(query, (user_id, timeframe_days))
    
    if not result or result[0]['total_credits'] is None:
        return {
            "current_credits": 0,
            "goal_credits": goal_credits,
            "progress_percentage": 0,
            "credits_remaining": goal_credits,
            "days_remaining": timeframe_days,
            "daily_rate_needed": round(goal_credits / timeframe_days, 1),
            "on_track": False
        }
    
    current_credits = int(result[0]['total_credits'])
    runs_count = result[0]['runs_count']
    
    progress_pct = (current_credits / goal_credits) * 100 if goal_credits > 0 else 0
    credits_remaining = max(0, goal_credits - current_credits)
    
    # Calculate if on track
    expected_progress = (100 / timeframe_days) * timeframe_days  # Should be scaling
    on_track = progress_pct >= (expected_progress * 0.8)  # Within 80% of expected
    
    # Calculate daily rate needed for remaining time
    days_remaining = max(1, timeframe_days)
    daily_rate_needed = credits_remaining / days_remaining
    
    return {
        "current_credits": current_credits,
        "goal_credits": goal_credits,
        "progress_percentage": round(progress_pct, 1),
        "credits_remaining": credits_remaining,
        "days_remaining": days_remaining,
        "daily_rate_needed": round(daily_rate_needed, 1),
        "current_daily_average": round(current_credits / max(1, timeframe_days - days_remaining), 1),
        "runs_completed": runs_count,
        "on_track": on_track,
        "recommendation": "You're on track!" if on_track else f"Earn {int(daily_rate_needed)} credits/day to reach goal"
    }


# API Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "credit-optimizer", "port": 8019}


@app.post("/credits/optimize-route")
async def get_optimal_route(req: CreditRouteRequest):
    """Generate route optimized for maximum credits"""
    try:
        route = optimize_credit_route(
            req.user_id,
            req.start_location,
            req.target_distance_km,
            req.current_hour
        )
        
        return formatter.success(route)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/credits/high-value-hexes")
async def get_high_value_hexes(req: HighValueHexRequest):
    """Find nearby high-value hexes"""
    try:
        hexes = find_high_value_hexes(
            req.user_id,
            req.current_location['lat'],
            req.current_location['lng'],
            req.max_distance_km
        )
        
        return formatter.success({
            "hexes": hexes,
            "total_found": len(hexes),
            "max_potential_credits": sum([h['total_value'] for h in hexes])
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/credits/goal-tracking")
async def track_goal_progress(req: GoalTrackingRequest):
    """Track progress towards credit goal"""
    try:
        cache_key = f"credit_goal:{req.user_id}:{req.goal_credits}"
        cached = cache.get(cache_key)
        if cached:
            return formatter.success(cached)
        
        progress = calculate_goal_progress(
            req.user_id,
            req.goal_credits,
            req.timeframe_days
        )
        
        # Cache for 1 hour
        cache.set(cache_key, progress, ttl=3600)
        
        return formatter.success(progress)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8019)
