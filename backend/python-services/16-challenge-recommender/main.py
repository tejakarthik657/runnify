# Service 16: Challenge Recommender
# Port: 8016
# Purpose: Recommend personalized daily and weekly challenges

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.utils import db, cache, formatter

app = FastAPI(title="Challenge Recommender", version="1.0.0")


class ChallengeRequest(BaseModel):
	user_id: str
	challenge_count: int = 3


class DailyChallengeRequest(BaseModel):
	user_id: str


class ProgressionRequest(BaseModel):
	user_id: str


def _get_user_baseline(user_id: str) -> Dict:
	query = """
		SELECT
			COUNT(*) AS runs_30d,
			COALESCE(SUM(distance_km), 0) AS distance_30d,
			COALESCE(AVG(distance_km), 0) AS avg_distance,
			COALESCE(SUM(hexes_captured), 0) AS hexes_30d,
			COALESCE(SUM(credits_earned), 0) AS credits_30d,
			MAX(created_at) AS last_run
		FROM runs
		WHERE user_id = %s
		  AND created_at >= NOW() - INTERVAL '30 days'
	"""
	rows = db.execute_query(query, (user_id,))
	if not rows:
		return {
			"runs_30d": 0,
			"distance_30d": 0.0,
			"avg_distance": 0.0,
			"hexes_30d": 0,
			"credits_30d": 0,
			"last_run": None,
		}
	data = rows[0]
	return {
		"runs_30d": int(data.get("runs_30d") or 0),
		"distance_30d": float(data.get("distance_30d") or 0),
		"avg_distance": float(data.get("avg_distance") or 0),
		"hexes_30d": int(data.get("hexes_30d") or 0),
		"credits_30d": float(data.get("credits_30d") or 0),
		"last_run": data.get("last_run"),
	}


def _base_challenges(profile: Dict) -> List[Dict]:
	avg_distance = max(profile["avg_distance"], 1.5)
	distance_goal = round(avg_distance * 1.2, 1)
	hex_goal = max(3, int(profile["hexes_30d"] / max(profile["runs_30d"], 1)))

	return [
		{
			"challenge_id": "dist-progress",
			"title": f"Run {distance_goal} km in one session",
			"type": "distance",
			"target": distance_goal,
			"reward_credits": int(80 + distance_goal * 8),
			"difficulty": "medium",
			"why": "Build endurance progressively based on your average run.",
		},
		{
			"challenge_id": "hex-sweep",
			"title": f"Capture {hex_goal} new hexes today",
			"type": "territory",
			"target": hex_goal,
			"reward_credits": int(60 + hex_goal * 20),
			"difficulty": "medium",
			"why": "Steady territory gain improves leaderboard mobility.",
		},
		{
			"challenge_id": "streak-maintain",
			"title": "Complete at least 1 run today",
			"type": "streak",
			"target": 1,
			"reward_credits": 50,
			"difficulty": "easy",
			"why": "Consistency compounds your engagement score and streak rewards.",
		},
		{
			"challenge_id": "credit-boost",
			"title": "Earn 250 credits from running",
			"type": "credits",
			"target": 250,
			"reward_credits": 120,
			"difficulty": "hard",
			"why": "Push for higher-value routes to maximize credit efficiency.",
		},
		{
			"challenge_id": "frequency-mini",
			"title": "Complete 3 runs this week",
			"type": "frequency",
			"target": 3,
			"reward_credits": 140,
			"difficulty": "medium",
			"why": "Three runs/week is the strongest signal for momentum.",
		},
	]


def recommend_challenges(user_id: str, challenge_count: int) -> Dict:
	cache_key = f"challenges:recommend:{user_id}:{challenge_count}"
	cached = cache.get(cache_key)
	if cached:
		return cached

	profile = _get_user_baseline(user_id)
	if profile["runs_30d"] == 0:
		starter = [
			{
				"challenge_id": "starter-1",
				"title": "Take your first 2 km run",
				"type": "distance",
				"target": 2,
				"reward_credits": 100,
				"difficulty": "easy",
				"why": "Kickstart activity and unlock personalized recommendations.",
			},
			{
				"challenge_id": "starter-2",
				"title": "Capture 2 nearby hexes",
				"type": "territory",
				"target": 2,
				"reward_credits": 80,
				"difficulty": "easy",
				"why": "Early map control improves progression and rewards.",
			},
			{
				"challenge_id": "starter-3",
				"title": "Run on 2 different days this week",
				"type": "frequency",
				"target": 2,
				"reward_credits": 120,
				"difficulty": "easy",
				"why": "A small routine is enough to start a streak.",
			},
		]
		return {
			"profile_level": "starter",
			"recommendations": starter[:max(1, min(challenge_count, 5))],
		}

	pool = _base_challenges(profile)
	# Lightweight ranking by profile fit.
	scored = []
	for item in pool:
		fit = 0
		if item["type"] == "distance":
			fit = 70 + min(int(profile["avg_distance"] * 3), 20)
		elif item["type"] == "territory":
			fit = 60 + min(profile["hexes_30d"] // 3, 25)
		elif item["type"] == "streak":
			fit = 85
		elif item["type"] == "credits":
			fit = 55 + min(int(profile["credits_30d"] / 200), 30)
		elif item["type"] == "frequency":
			fit = 65 + min(profile["runs_30d"] * 2, 25)

		scored.append({**item, "fit_score": min(fit, 100)})

	scored.sort(key=lambda x: x["fit_score"], reverse=True)
	result = {
		"profile_level": "active",
		"recommendations": scored[:max(1, min(challenge_count, 5))],
	}
	cache.set(cache_key, result, ttl=1800)
	return result


def daily_challenge(user_id: str) -> Dict:
	profile = _get_user_baseline(user_id)
	if profile["runs_30d"] == 0:
		return {
			"title": "Starter Daily",
			"objective": "Run 2 km and capture 1 hex",
			"reward_credits": 120,
			"difficulty": "easy",
		}

	target_km = round(max(2.0, profile["avg_distance"] * 0.8), 1)
	target_hex = max(2, int((profile["hexes_30d"] / max(profile["runs_30d"], 1)) * 0.8))
	return {
		"title": "Momentum Daily",
		"objective": f"Run {target_km} km and capture {target_hex} hexes",
		"reward_credits": int(90 + target_km * 10 + target_hex * 10),
		"difficulty": "medium",
	}


def progression_snapshot(user_id: str) -> Dict:
	profile = _get_user_baseline(user_id)
	weekly_distance_goal = round(max(10.0, profile["avg_distance"] * 4), 1)
	weekly_hex_goal = max(12, int((profile["hexes_30d"] / 4) + 2))

	return {
		"current": {
			"runs_30d": profile["runs_30d"],
			"distance_30d": profile["distance_30d"],
			"avg_distance": profile["avg_distance"],
			"hexes_30d": profile["hexes_30d"],
		},
		"next_week_goals": {
			"distance_km": weekly_distance_goal,
			"hexes": weekly_hex_goal,
			"runs": max(3, min(6, profile["runs_30d"] // 4 + 1)),
		},
		"coaching_tip": "Keep at least one rest day between long runs for better consistency.",
	}


@app.get("/health")
async def health_check():
	return {"status": "healthy", "service": "challenge-recommender", "port": 8016}


@app.post("/challenges/recommend")
async def recommend_challenges_endpoint(request: ChallengeRequest):
	try:
		data = recommend_challenges(request.user_id, request.challenge_count)
		return formatter.success(data)
	except Exception as exc:
		raise HTTPException(status_code=500, detail=str(exc))


@app.post("/challenges/daily")
async def daily_challenge_endpoint(request: DailyChallengeRequest):
	try:
		data = daily_challenge(request.user_id)
		return formatter.success(data)
	except Exception as exc:
		raise HTTPException(status_code=500, detail=str(exc))


@app.post("/challenges/progression")
async def progression_endpoint(request: ProgressionRequest):
	try:
		data = progression_snapshot(request.user_id)
		return formatter.success(data)
	except Exception as exc:
		raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
	import uvicorn

	uvicorn.run(app, host="0.0.0.0", port=8016)
