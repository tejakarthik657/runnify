"""
Heatmap Generator - Generate heatmap data for run pattern visualization
Port: 8008
Service 08 in the 20-service architecture
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
import json

# Shared imports
import sys
sys.path.insert(0, '../shared')
from utils import db, cache, formatter, h3

app = FastAPI(title="Heatmap Generator", version="1.0.0")

class UserHeatmapRequest(BaseModel):
    user_id: str
    time_period: str = "30"  # days
    heatmap_type: str = "runs"  # runs, territories, activity

class AreaHeatmapRequest(BaseModel):
    center_lat: float
    center_lng: float
    radius_km: float = 10
    heatmap_type: str = "activity"

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "heatmap-generator", "port": 8008}

@app.post("/heatmap/user-activity")
async def get_user_heatmap(req: UserHeatmapRequest):
    """Generate heatmap data for user's runs and territories"""
    try:
        cache_key = f"heatmap:{req.user_id}:{req.time_period}d:{req.heatmap_type}:1h"
        cached = cache.get(cache_key)
        if cached:
            return formatter.format_response(success=True, data=json.loads(cached))

        days = int(req.time_period)
        cutoff_date = datetime.now() - timedelta(days=days)

        heatmap_data = {
            "users": {},
            "grid_cells": {},
            "intensity_layers": []
        }

        if req.heatmap_type in ["runs", "activity"]:
            # Fetch run trace points for user
            traces = db.fetch(
                """SELECT rt.latitude, rt.longitude FROM run_trace_points rt
                   JOIN runs r ON rt.run_id = r.id
                   WHERE r.user_id = %s AND r.created_at >= %s
                   LIMIT 10000""",
                (req.user_id, cutoff_date)
            )

            # Bucket into ~100m grid cells (0.001 degree ≈ 111m)
            for point in traces:
                lat = round(float(point['latitude']) / 0.001) * 0.001
                lng = round(float(point['longitude']) / 0.001) * 0.001
                cell_key = f"{lat:.3f},{lng:.3f}"
                
                if cell_key not in heatmap_data['grid_cells']:
                    heatmap_data['grid_cells'][cell_key] = {"lat": lat, "lng": lng, "count": 0}
                heatmap_data['grid_cells'][cell_key]["count"] += 1

        if req.heatmap_type in ["territories", "activity"]:
            # Fetch territories owned by user
            territories = db.fetch(
                """SELECT hex_id FROM territories 
                   WHERE owner_user_id = %s AND invaded_count < 5
                   LIMIT 10000""",
                (req.user_id,)
            )

            # Use H3 to get hex center coordinates
            hex_list = [t['hex_id'] for t in territories]
            for hex_id in hex_list:
                try:
                    lat, lng = _hex_to_latlng(hex_id)
                    lat, lng = round(lat, 3), round(lng, 3)
                    cell_key = f"{lat:.3f},{lng:.3f}"
                    
                    if cell_key not in heatmap_data['grid_cells']:
                        heatmap_data['grid_cells'][cell_key] = {"lat": lat, "lng": lng, "count": 0, "territory": True}
                    heatmap_data['grid_cells'][cell_key]["count"] += 2  # territories count double
                    heatmap_data['grid_cells'][cell_key]["territory"] = True
                except:
                    pass

        # Convert to intensity layers for frontend
        if heatmap_data['grid_cells']:
            max_count = max(cell['count'] for cell in heatmap_data['grid_cells'].values())
            
            for cell_key, cell in heatmap_data['grid_cells'].items():
                intensity = cell['count'] / max_count if max_count > 0 else 0
                intensity_layer = {
                    "lat": cell["lat"],
                    "lng": cell["lng"],
                    "intensity": round(intensity, 2),
                    "count": cell["count"],
                    "type": "territory" if cell.get("territory") else "run"
                }
                heatmap_data['intensity_layers'].append(intensity_layer)

        result = {
            "user_id": req.user_id,
            "time_period_days": days,
            "type": req.heatmap_type,
            "cell_count": len(heatmap_data['grid_cells']),
            "grid_cells": list(heatmap_data['grid_cells'].values())[:1000],  # limit to 1000
            "intensity_layers": sorted(heatmap_data['intensity_layers'], key=lambda x: x['intensity'], reverse=True)[:500],
            "bounds": _calculate_bounds(heatmap_data['grid_cells'])
        }

        cache.set(cache_key, json.dumps(result), ttl=3600)
        return formatter.format_response(success=True, data=result)

    except Exception as e:
        return formatter.format_response(success=False, error=str(e), status_code=500)

@app.post("/heatmap/area-activity")
async def get_area_heatmap(req: AreaHeatmapRequest):
    """Generate heatmap for a geographic area"""
    try:
        cache_key = f"heatmap:area:{req.center_lat}:{req.center_lng}:{req.radius_km}:{req.heatmap_type}:1h"
        cached = cache.get(cache_key)
        if cached:
            return formatter.format_response(success=True, data=json.loads(cached))

        # Fetch all activities in area
        # Using rough bounding box (0.01 degree ≈ 1.1km)
        delta = req.radius_km / 111
        
        traces = db.fetch(
            """SELECT rt.latitude, rt.longitude, r.user_id FROM run_trace_points rt
               JOIN runs r ON rt.run_id = r.id
               WHERE rt.latitude BETWEEN %s AND %s 
               AND rt.longitude BETWEEN %s AND %s
               LIMIT 50000""",
            (
                req.center_lat - delta,
                req.center_lat + delta,
                req.center_lng - delta,
                req.center_lng + delta
            )
        )

        # Build heatmap
        grid_cells = {}
        user_count = set()
        
        for point in traces:
            lat = round(float(point['latitude']) / 0.001) * 0.001
            lng = round(float(point['longitude']) / 0.001) * 0.001
            cell_key = f"{lat:.3f},{lng:.3f}"
            
            if cell_key not in grid_cells:
                grid_cells[cell_key] = {"lat": lat, "lng": lng, "count": 0, "users": set()}
            grid_cells[cell_key]["count"] += 1
            grid_cells[cell_key]["users"].add(point['user_id'])
            user_count.add(point['user_id'])

        # Convert users set to count
        for cell in grid_cells.values():
            cell["user_count"] = len(cell["users"])
            del cell["users"]

        result = {
            "center_lat": req.center_lat,
            "center_lng": req.center_lng,
            "radius_km": req.radius_km,
            "type": req.heatmap_type,
            "cell_count": len(grid_cells),
            "user_count": len(user_count),
            "total_activities": sum(c['count'] for c in grid_cells.values()),
            "grid_cells": list(grid_cells.values())[:1000]
        }

        cache.set(cache_key, json.dumps(result), ttl=3600)
        return formatter.format_response(success=True, data=result)

    except Exception as e:
        return formatter.format_response(success=False, error=str(e), status_code=500)

@app.post("/heatmap/intensity-matrix")
async def get_intensity_matrix(req: UserHeatmapRequest):
    """Get heatmap as intensity matrix for visualization"""
    try:
        cache_key = f"heatmap:matrix:{req.user_id}:{req.time_period}d:1h"
        cached = cache.get(cache_key)
        if cached:
            return formatter.format_response(success=True, data=json.loads(cached))

        days = int(req.time_period)
        cutoff_date = datetime.now() - timedelta(days=days)

        traces = db.fetch(
            """SELECT rt.latitude, rt.longitude FROM run_trace_points rt
               JOIN runs r ON rt.run_id = r.id
               WHERE r.user_id = %s AND r.created_at >= %s""",
            (req.user_id, cutoff_date)
        )

        if not traces:
            return formatter.format_response(
                success=True,
                data={"matrix": [], "bounds": None}
            )

        # Create grid: find bounds and create cells
        lats = [float(t['latitude']) for t in traces]
        lngs = [float(t['longitude']) for t in traces]
        
        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)

        # 20x20 grid
        grid_size = 20
        lat_step = (max_lat - min_lat) / grid_size
        lng_step = (max_lng - min_lng) / grid_size

        matrix = [[0] * grid_size for _ in range(grid_size)]
        max_count = 0

        for trace in traces:
            lat, lng = float(trace['latitude']), float(trace['longitude'])
            lat_idx = int((lat - min_lat) / lat_step) if lat_step > 0 else 0
            lng_idx = int((lng - min_lng) / lng_step) if lng_step > 0 else 0
            
            lat_idx = min(lat_idx, grid_size - 1)
            lng_idx = min(lng_idx, grid_size - 1)
            
            matrix[lat_idx][lng_idx] += 1
            max_count = max(max_count, matrix[lat_idx][lng_idx])

        # Normalize to 0-100
        normalized = [[int(cell / max_count * 100) if max_count > 0 else 0 for cell in row] for row in matrix]

        result = {
            "matrix": normalized,
            "grid_size": grid_size,
            "bounds": {
                "min_lat": round(min_lat, 4),
                "max_lat": round(max_lat, 4),
                "min_lng": round(min_lng, 4),
                "max_lng": round(max_lng, 4)
            },
            "max_intensity": int(max_count)
        }

        cache.set(cache_key, json.dumps(result), ttl=3600)
        return formatter.format_response(success=True, data=result)

    except Exception as e:
        return formatter.format_response(success=False, error=str(e), status_code=500)

def _calculate_bounds(grid_cells):
    """Calculate geographic bounds from grid cells"""
    if not grid_cells:
        return None
    
    lats = [cell['lat'] for cell in grid_cells.values()]
    lngs = [cell['lng'] for cell in grid_cells.values()]
    
    return {
        "min_lat": round(min(lats), 4),
        "max_lat": round(max(lats), 4),
        "min_lng": round(min(lngs), 4),
        "max_lng": round(max(lngs), 4)
    }

def _hex_to_latlng(hex_id):
    """Compatibility wrapper for different h3-py versions."""
    if hasattr(h3, 'cell_to_latlng'):
        return h3.cell_to_latlng(hex_id)
    if hasattr(h3, 'h3_to_geo'):
        return h3.h3_to_geo(hex_id)
    raise ValueError('No compatible hex-to-geo function found in h3 module')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)
