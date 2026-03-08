# Service 06: Route Optimization
# Port: 8006
# Purpose: Recommend practical high-value route waypoints

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List
import sys
import os
import h3

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.utils import db, cache, formatter, haversine_distance

app = FastAPI(title="Route Optimization Service", version="1.0.0")


class RouteOptimizeRequest(BaseModel):
    user_id: str
    start_lat: float
    start_lng: float
    max_distance_km: float = 8.0
    max_waypoints: int = 8


class RouteYieldRequest(BaseModel):
    user_id: str
    start_lat: float
    start_lng: float
    radius_rings: int = 5


class SafeZoneRequest(BaseModel):
    user_id: str
    start_lat: float
    start_lng: float


def _hex_value(user_id: str, hex_id: str) -> Dict:
    owner_rows = db.execute_query("SELECT owner_id FROM territories WHERE hex_id = %s LIMIT 1", (hex_id,))
    owner_id = owner_rows[0].get("owner_id") if owner_rows else None

    if owner_id == user_id:
        status = "owned"
        value = 1
    elif owner_id is None:
        status = "unclaimed"
        value = 10
    else:
        status = "enemy"
        value = 25

    adjacency_bonus = 0
    for n in h3.k_ring(hex_id, 1):
        if n == hex_id:
            continue
        n_owner = db.execute_query("SELECT owner_id FROM territories WHERE hex_id = %s LIMIT 1", (n,))
        if n_owner and n_owner[0].get("owner_id") == user_id:
            adjacency_bonus += 3

    return {
        "hex_id": hex_id,
        "status": status,
        "base_value": value,
        "adjacency_bonus": adjacency_bonus,
        "value_score": value + adjacency_bonus,
    }


def optimize_route(user_id: str, start_lat: float, start_lng: float, max_distance_km: float, max_waypoints: int) -> Dict:
    cache_key = f"route:opt:{user_id}:{start_lat:.4f}:{start_lng:.4f}:{max_distance_km}:{max_waypoints}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    start_hex = h3.geo_to_h3(start_lat, start_lng, 9)
    candidates = []

    # Search nearby rings and score each candidate by value/distance.
    ring_limit = max(2, min(10, int(max_distance_km)))
    for hex_id in h3.k_ring(start_hex, ring_limit):
        lat, lng = h3.h3_to_geo(hex_id)
        distance_km = haversine_distance(start_lat, start_lng, lat, lng)
        if distance_km > max_distance_km:
            continue

        meta = _hex_value(user_id, hex_id)
        if meta["status"] == "owned":
            continue

        efficiency = meta["value_score"] / max(distance_km, 0.2)
        candidates.append(
            {
                **meta,
                "lat": lat,
                "lng": lng,
                "distance_km": round(distance_km, 2),
                "efficiency": round(efficiency, 2),
            }
        )

    candidates.sort(key=lambda x: (x["efficiency"], x["value_score"]), reverse=True)
    selected = candidates[: max(1, min(max_waypoints, 12))]

    estimated_credits = sum(10 if x["status"] == "unclaimed" else 25 for x in selected)
    estimated_distance = round(sum(x["distance_km"] for x in selected), 2)

    response = {
        "start_hex": start_hex,
        "recommended_waypoints": selected,
        "estimated_credits": estimated_credits,
        "estimated_total_distance_km": estimated_distance,
        "strategy": "Hit enemy hexes first, then unclaimed connectors.",
    }
    cache.set(cache_key, response, ttl=1800)
    return response


def estimate_route_yield(user_id: str, start_lat: float, start_lng: float, radius_rings: int) -> Dict:
    start_hex = h3.geo_to_h3(start_lat, start_lng, 9)
    ring = max(1, min(radius_rings, 12))

    total_enemy = 0
    total_unclaimed = 0
    total_owned = 0

    for hex_id in h3.k_ring(start_hex, ring):
        owner_rows = db.execute_query("SELECT owner_id FROM territories WHERE hex_id = %s LIMIT 1", (hex_id,))
        owner_id = owner_rows[0].get("owner_id") if owner_rows else None
        if owner_id == user_id:
            total_owned += 1
        elif owner_id is None:
            total_unclaimed += 1
        else:
            total_enemy += 1

    return {
        "scan_rings": ring,
        "enemy_hexes": total_enemy,
        "unclaimed_hexes": total_unclaimed,
        "owned_hexes": total_owned,
        "max_credit_potential": total_enemy * 25 + total_unclaimed * 10,
    }


def suggest_safe_zones(user_id: str, start_lat: float, start_lng: float) -> Dict:
    start_hex = h3.geo_to_h3(start_lat, start_lng, 9)
    candidates = []

    for hex_id in h3.k_ring(start_hex, 3):
        owner_rows = db.execute_query("SELECT owner_id FROM territories WHERE hex_id = %s LIMIT 1", (hex_id,))
        owner_id = owner_rows[0].get("owner_id") if owner_rows else None
        if owner_id not in (None, user_id):
            continue

        friendly_neighbors = 0
        for n in h3.k_ring(hex_id, 1):
            n_owner_rows = db.execute_query("SELECT owner_id FROM territories WHERE hex_id = %s LIMIT 1", (n,))
            n_owner = n_owner_rows[0].get("owner_id") if n_owner_rows else None
            if n_owner in (None, user_id):
                friendly_neighbors += 1

        lat, lng = h3.h3_to_geo(hex_id)
        candidates.append(
            {
                "hex_id": hex_id,
                "lat": lat,
                "lng": lng,
                "friendly_neighbors": friendly_neighbors,
            }
        )

    candidates.sort(key=lambda x: x["friendly_neighbors"], reverse=True)
    return {"safe_zones": candidates[:5]}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "route-optimization", "port": 8006}


@app.post("/routes/optimize")
async def optimize_route_endpoint(request: RouteOptimizeRequest):
    try:
        data = optimize_route(
            request.user_id,
            request.start_lat,
            request.start_lng,
            max(1.0, min(request.max_distance_km, 30.0)),
            request.max_waypoints,
        )
        return formatter.success(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/routes/estimate-yield")
async def estimate_yield_endpoint(request: RouteYieldRequest):
    try:
        data = estimate_route_yield(request.user_id, request.start_lat, request.start_lng, request.radius_rings)
        return formatter.success(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/routes/safe-zones")
async def safe_zones_endpoint(request: SafeZoneRequest):
    try:
        data = suggest_safe_zones(request.user_id, request.start_lat, request.start_lng)
        return formatter.success(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8006)
