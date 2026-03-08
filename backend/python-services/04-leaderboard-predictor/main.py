# Service 04: Leaderboard Predictor
# Port: 8004
# Purpose: Predict rank movement and suggest realistic goals

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List
from datetime import datetime
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.utils import db, cache, formatter

app = FastAPI(title="Leaderboard Predictor", version="1.0.0")


class RankPredictRequest(BaseModel):
    user_id: str
    horizon_days: int = 7


class RivalRequest(BaseModel):
    user_id: str


class PointsGapRequest(BaseModel):
    user_id: str


def _fetch_leaderboard_stats(days: int = 30) -> List[Dict]:
    """Build a lightweight leaderboard score from run activity."""
    query = """
        SELECT
            user_id,
            COUNT(*) AS run_count,
            COALESCE(SUM(distance_km), 0) AS total_distance,
            COALESCE(SUM(credits_earned), 0) AS total_credits,
            COALESCE(SUM(hexes_captured), 0) AS total_hexes,
            MAX(created_at) AS last_run
        FROM runs
        WHERE created_at >= NOW() - (%s || ' days')::interval
        GROUP BY user_id
    """
    rows = db.execute_query(query, (days,))
    if not rows:
        return []

    leaderboard = []
    for row in rows:
        score = int(
            (row.get("run_count") or 0) * 20
            + float(row.get("total_distance") or 0) * 10
            + (row.get("total_hexes") or 0) * 25
            + float(row.get("total_credits") or 0) * 0.2
        )
        leaderboard.append(
            {
                "user_id": row.get("user_id"),
                "score": score,
                "run_count": int(row.get("run_count") or 0),
                "total_distance": float(row.get("total_distance") or 0),
                "last_run": row.get("last_run"),
            }
        )

    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    return leaderboard


def predict_rank(user_id: str, horizon_days: int) -> Dict:
    cache_key = f"leaderboard:predict:{user_id}:{horizon_days}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    leaderboard = _fetch_leaderboard_stats(30)
    if not leaderboard:
        return {
            "current_rank": None,
            "predicted_rank": None,
            "message": "No leaderboard data yet",
        }

    me = next((x for x in leaderboard if x["user_id"] == user_id), None)
    if not me:
        return {
            "current_rank": len(leaderboard) + 1,
            "predicted_rank": len(leaderboard) + 1,
            "message": "No runs yet for this user",
        }

    # Simple momentum estimate: recent weekly pace extrapolated
    recent = db.execute_query(
        """
        SELECT
            COUNT(*) AS runs_7d,
            COALESCE(SUM(distance_km), 0) AS distance_7d,
            COALESCE(SUM(credits_earned), 0) AS credits_7d,
            COALESCE(SUM(hexes_captured), 0) AS hexes_7d
        FROM runs
        WHERE user_id = %s
          AND created_at >= NOW() - INTERVAL '7 days'
        """,
        (user_id,),
    )
    activity = recent[0] if recent else {}
    weekly_gain = int(
        (activity.get("runs_7d") or 0) * 20
        + float(activity.get("distance_7d") or 0) * 10
        + (activity.get("hexes_7d") or 0) * 25
        + float(activity.get("credits_7d") or 0) * 0.2
    )

    projected_gain = int(weekly_gain * (horizon_days / 7.0))
    projected_score = me["score"] + projected_gain
    predicted_rank = 1 + sum(1 for x in leaderboard if x["user_id"] != user_id and x["score"] > projected_score)

    response = {
        "current_rank": me["rank"],
        "predicted_rank": predicted_rank,
        "current_score": me["score"],
        "projected_score": projected_score,
        "projected_gain": projected_gain,
        "horizon_days": horizon_days,
        "movement": me["rank"] - predicted_rank,
    }
    cache.set(cache_key, response, ttl=1800)
    return response


def analyze_rivals(user_id: str) -> Dict:
    leaderboard = _fetch_leaderboard_stats(30)
    me = next((x for x in leaderboard if x["user_id"] == user_id), None)
    if not me:
        return {"message": "User not ranked yet", "rivals": []}

    above = next((x for x in leaderboard if x["rank"] == me["rank"] - 1), None)
    below = next((x for x in leaderboard if x["rank"] == me["rank"] + 1), None)

    rivals = []
    if above:
        rivals.append(
            {
                "type": "next_above",
                "user_id": above["user_id"],
                "gap": above["score"] - me["score"],
                "their_rank": above["rank"],
            }
        )
    if below:
        rivals.append(
            {
                "type": "next_below",
                "user_id": below["user_id"],
                "gap": me["score"] - below["score"],
                "their_rank": below["rank"],
            }
        )

    return {
        "current_rank": me["rank"],
        "current_score": me["score"],
        "rivals": rivals,
    }


def points_to_next_rank(user_id: str) -> Dict:
    leaderboard = _fetch_leaderboard_stats(30)
    me = next((x for x in leaderboard if x["user_id"] == user_id), None)
    if not me:
        return {
            "points_needed": 200,
            "tip": "Complete 2-3 runs and capture nearby hexes to enter ranking.",
        }

    if me["rank"] == 1:
        return {
            "points_needed": 0,
            "tip": "You are rank #1. Focus on consistency to defend your lead.",
        }

    above = next((x for x in leaderboard if x["rank"] == me["rank"] - 1), None)
    gap = max((above["score"] - me["score"] + 1), 1) if above else 1

    return {
        "current_rank": me["rank"],
        "points_needed": gap,
        "estimated_runs": max(1, gap // 120),
        "tip": "Prioritize enemy-hex captures and one medium-long run this week.",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "leaderboard-predictor", "port": 8004}


@app.post("/leaderboard/predict-rank")
async def predict_rank_endpoint(request: RankPredictRequest):
    try:
        data = predict_rank(request.user_id, max(1, min(request.horizon_days, 30)))
        return formatter.success(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/leaderboard/rival-analysis")
async def rival_analysis_endpoint(request: RivalRequest):
    try:
        data = analyze_rivals(request.user_id)
        return formatter.success(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/leaderboard/points-to-next")
async def points_to_next_endpoint(request: PointsGapRequest):
    try:
        data = points_to_next_rank(request.user_id)
        return formatter.success(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8004)
