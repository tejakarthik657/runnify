# Service 02: Hex Territory Analyzer
# Port: 8002
# Tech: H3 library (fast hex math)
# Purpose: Analyze hex territories, find clusters, suggest expansions

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Tuple
import sys
import os
import h3

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.utils import db, cache, formatter

app = FastAPI(title="Hex Territory Analyzer", version="1.0.0")

# Request Models
class TerritoryAnalysisRequest(BaseModel):
    user_id: str

class ExpansionRequest(BaseModel):
    user_id: str
    current_location: Dict  # {"lat": float, "lng": float}
    max_suggestions: int = 5

class ClusterRequest(BaseModel):
    user_id: str


def get_user_hexes(user_id: str) -> List[str]:
    """Get all hexes owned by user"""
    query = """
        SELECT hex_id FROM territories
        WHERE owner_id = %s
    """
    results = db.execute_query(query, (user_id,))
    return [r['hex_id'] for r in results]


def calculate_territory_stats(hex_ids: List[str]) -> Dict:
    """Calculate territory statistics"""
    if not hex_ids:
        return {
            "total_hexes": 0,
            "fragmentation_score": 0,
            "cluster_count": 0,
            "largest_cluster": 0
        }
    
    # Find clusters (connected hexes)
    clusters = []
    visited = set()
    
    for hex_id in hex_ids:
        if hex_id in visited:
            continue
        
        # BFS to find connected cluster
        cluster = set()
        queue = [hex_id]
        
        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            
            visited.add(current)
            cluster.add(current)
            
            # Check neighbors
            neighbors = h3.hex_ring(current, 1)
            for neighbor in neighbors:
                if neighbor in hex_ids and neighbor not in visited:
                    queue.append(neighbor)
        
        clusters.append(cluster)
    
    # Calculate fragmentation (0 = all connected, 1 = all separate)
    fragmentation = 1 - (max(len(c) for c in clusters) / len(hex_ids)) if hex_ids else 0
    
    return {
        "total_hexes": len(hex_ids),
        "fragmentation_score": round(fragmentation, 2),
        "cluster_count": len(clusters),
        "largest_cluster": max(len(c) for c in clusters) if clusters else 0,
        "clusters": [list(c) for c in clusters[:5]]  # Return top 5 clusters
    }


def suggest_expansion_hexes(user_id: str, current_loc: Dict, max_suggestions: int) -> List[Dict]:
    """Suggest best hexes to capture next"""
    # Get user's current hexes
    user_hexes = get_user_hexes(user_id)
    
    # Get current location hex
    current_hex = h3.latlng_to_cell(current_loc['lat'], current_loc['lng'], 9)
    
    # Find nearby unclaimed hexes
    candidates = []
    
    # Check hexes in rings around current location
    for ring in range(1, 6):  # Check 5 rings
        ring_hexes = h3.hex_ring(current_hex, ring)
        
        for hex_id in ring_hexes:
            # Check if hex is unclaimed
            query = "SELECT owner_id FROM territories WHERE hex_id = %s"
            result = db.execute_query(query, (hex_id,))
            
            is_unclaimed = len(result) == 0
            is_enemy = len(result) > 0 and result[0]['owner_id'] != user_id
            
            # Calculate strategic value
            value_score = 0
            
            if is_unclaimed:
                value_score += 10  # Base value for unclaimed
                
                # Bonus if adjacent to user's hexes
                neighbors = h3.hex_ring(hex_id, 1)
                adj_owned = sum(1 for n in neighbors if n in user_hexes)
                value_score += adj_owned * 5  # 5 points per adjacent owned hex
                
            elif is_enemy:
                value_score += 5  # Enemy hexes worth less initially
            
            if value_score > 0:
                lat, lng = h3.cell_to_latlng(hex_id)
                candidates.append({
                    "hex_id": hex_id,
                    "lat": lat,
                    "lng": lng,
                    "value_score": value_score,
                    "status": "unclaimed" if is_unclaimed else "enemy",
                    "distance_rings": ring
                })
    
    # Sort by value and return top suggestions
    candidates.sort(key=lambda x: (-x['value_score'], x['distance_rings']))
    
    return candidates[:max_suggestions]


# API Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "hex-territory-analyzer", "port": 8002}


@app.post("/hex/analyze-territory")
async def analyze_territory(req: TerritoryAnalysisRequest):
    """Analyze user's territory"""
    try:
        cache_key = f"territory_analysis:{req.user_id}"
        cached = cache.get(cache_key)
        if cached:
            return formatter.success(cached)
        
        hex_ids = get_user_hexes(req.user_id)
        stats = calculate_territory_stats(hex_ids)
        
        # Cache for 30 minutes
        cache.set(cache_key, stats, ttl=1800)
        
        return formatter.success(stats)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/hex/expansion-suggestions")
async def suggest_expansions(req: ExpansionRequest):
    """Suggest next best hexes to claim"""
    try:
        suggestions = suggest_expansion_hexes(
            req.user_id, 
            req.current_location, 
            req.max_suggestions
        )
        
        return formatter.success({
            "suggestions": suggestions,
            "total_found": len(suggestions)
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/hex/cluster-detection")
async def detect_clusters(req: ClusterRequest):
    """Find hex clusters and patterns"""
    try:
        hex_ids = get_user_hexes(req.user_id)
        stats = calculate_territory_stats(hex_ids)
        
        return formatter.success({
            "clusters": stats['clusters'],
            "cluster_count": stats['cluster_count'],
            "fragmentation": stats['fragmentation_score'],
            "recommendation": "Focus on connecting clusters" if stats['fragmentation_score'] > 0.5 else "Territory well connected"
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
