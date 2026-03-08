"""
Territory Analyzer - Territory expansion analysis and optimization
Port: 8005
Service 05 in the 20-service architecture
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
import json

# Shared imports
import sys
sys.path.insert(0, '../shared')
from utils import db, cache, formatter, h3

app = FastAPI(title="Territory Analyzer", version="1.0.0")

class TerritoryAnalysisRequest(BaseModel):
    user_id: str
    analysis_type: str = "expansion"  # expansion, vulnerability, efficiency

class ExpansionPathRequest(BaseModel):
    user_id: str
    start_hex: str
    max_distance: int = 5  # hex rings

class VulnerabilityRequest(BaseModel):
    user_id: str
    threshold: float = 0.5  # vulnerability score threshold

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "territory-analyzer", "port": 8005}

@app.post("/territories/analyze")
async def analyze_territory(req: TerritoryAnalysisRequest):
    """Analyze user's territory expansion patterns and metrics"""
    try:
        cache_key = f"territory:analysis:{req.user_id}:{req.analysis_type}:1h"
        cached = cache.get(cache_key)
        if cached:
            return formatter.format_response(success=True, data=json.loads(cached))

        # Fetch user's territories
        territories = db.fetch(
            "SELECT hex_id, owner_user_id, invaded_count, last_invaded, created_at FROM territories WHERE owner_user_id = %s",
            (req.user_id,)
        )
        
        if not territories:
            return formatter.format_response(
                success=True,
                data={
                    "total_hexes": 0,
                    "expansion_rate": 0,
                    "vulnerability_score": 0,
                    "efficiency_score": 0,
                    "recommendation": "Start by claiming your first hex!"
                }
            )

        # Calculate metrics
        total_hexes = len(territories)
        days_active = (datetime.now() - datetime.fromisoformat(territories[0]['created_at'])).days or 1
        expansion_rate = total_hexes / days_active  # hexes per day
        
        # Vulnerability: territories with high invasion counts
        vulnerable_count = sum(1 for t in territories if t['invaded_count'] > 3)
        vulnerability_score = min(1.0, vulnerable_count / max(1, total_hexes))
        
        # Efficiency: cluster compactness (nearby hexes = more efficient)
        if len(territories) > 1:
            hex_list = [t['hex_id'] for t in territories]
            distances = []
            for i, h1 in enumerate(hex_list):
                for h2 in hex_list[i+1:]:
                    try:
                        distances.append(_hex_distance(h1, h2))
                    except Exception:
                        pass
            avg_distance = sum(distances) / len(distances) if distances else 0
            efficiency_score = 1.0 / (1.0 + avg_distance)  # closer = more efficient
        else:
            efficiency_score = 0.5

        analysis = {
            "total_hexes": total_hexes,
            "days_active": days_active,
            "expansion_rate": round(expansion_rate, 2),
            "vulnerable_hexes": vulnerable_count,
            "vulnerability_score": round(vulnerability_score, 2),
            "efficiency_score": round(efficiency_score, 2),
            "recommendation": _get_territory_recommendation(
                expansion_rate, vulnerability_score, efficiency_score, total_hexes
            )
        }

        cache.set(cache_key, json.dumps(analysis), ttl=3600)
        return formatter.format_response(success=True, data=analysis)

    except Exception as e:
        return formatter.format_response(success=False, error=str(e), status_code=500)

@app.post("/territories/expansion-path")
async def get_expansion_path(req: ExpansionPathRequest):
    """Suggest optimal expansion path from a starting hex"""
    try:
        cache_key = f"territory:expansion:{req.user_id}:{req.start_hex}:{req.max_distance}:1h"
        cached = cache.get(cache_key)
        if cached:
            return formatter.format_response(success=True, data=json.loads(cached))

        # Get user's owned hexes
        owned_hexes = db.fetch(
            "SELECT hex_id FROM territories WHERE owner_user_id = %s AND invaded_count < 3",
            (req.user_id,)
        )
        owned_set = {t['hex_id'] for t in owned_hexes}

        # Get opponent hexes (inverse heuristic)
        opponent_hexes = db.fetch(
            "SELECT hex_id FROM territories WHERE owner_user_id != %s LIMIT 1000",
            (req.user_id,)
        )
        opponent_set = {t['hex_id'] for t in opponent_hexes}

        # Search rings from start_hex
        expansion_path = []
        visited = set()
        
        for ring in range(1, req.max_distance + 1):
            try:
                ring_hexes = _hex_ring(req.start_hex, ring)
            except Exception:
                ring_hexes = []
            
            for hex_id in ring_hexes:
                if hex_id in visited:
                    continue
                visited.add(hex_id)

                # Score: owned=1 (extend), unclaimed=5 (neutral), opponent=10 (valuable)
                if hex_id in owned_set:
                    score = 1
                elif hex_id in opponent_set:
                    score = 10
                else:
                    score = 5

                expansion_path.append({
                    "hex_id": hex_id,
                    "ring": ring,
                    "priority_score": score
                })

        # Sort by priority score (descending)
        expansion_path.sort(key=lambda x: x['priority_score'], reverse=True)
        expansion_path = expansion_path[:20]  # top 20

        result = {
            "start_hex": req.start_hex,
            "expansion_path": expansion_path,
            "owned_nearby": len([h for h in expansion_path if h['priority_score'] == 1]),
            "unclaimed_nearby": len([h for h in expansion_path if h['priority_score'] == 5]),
            "opponent_nearby": len([h for h in expansion_path if h['priority_score'] == 10]),
            "strategy": _get_expansion_strategy(expansion_path)
        }

        cache.set(cache_key, json.dumps(result), ttl=3600)
        return formatter.format_response(success=True, data=result)

    except Exception as e:
        return formatter.format_response(success=False, error=str(e), status_code=500)

@app.post("/territories/vulnerability")
async def analyze_vulnerability(req: VulnerabilityRequest):
    """Identify vulnerable territories likely to be invaded"""
    try:
        cache_key = f"territory:vulnerability:{req.user_id}:{req.threshold}:1h"
        cached = cache.get(cache_key)
        if cached:
            return formatter.format_response(success=True, data=json.loads(cached))

        # Fetch vulnerable territories
        territories = db.fetch(
            """SELECT hex_id, invaded_count, last_invaded, created_at 
               FROM territories 
               WHERE owner_user_id = %s 
               ORDER BY invaded_count DESC""",
            (req.user_id,)
        )

        vulnerable = []
        for t in territories:
            days_held = (datetime.now() - datetime.fromisoformat(t['created_at'])).days
            invasion_frequency = t['invaded_count'] / max(1, days_held)
            
            # Vulnerability score: high invasions + recent invasions = high risk
            recency_factor = 1.0 if t['last_invaded'] and \
                (datetime.now() - datetime.fromisoformat(t['last_invaded'])).days < 3 else 0.5
            vulnerability_score = (invasion_frequency / 10) * recency_factor
            
            if vulnerability_score >= req.threshold:
                vulnerable.append({
                    "hex_id": t['hex_id'],
                    "invasion_count": t['invaded_count'],
                    "days_held": days_held,
                    "invasion_frequency": round(invasion_frequency, 2),
                    "vulnerability_score": round(vulnerability_score, 2),
                    "risk_level": "critical" if vulnerability_score > 0.7 else "high" if vulnerability_score > 0.5 else "medium"
                })

        # Sort by vulnerability score
        vulnerable.sort(key=lambda x: x['vulnerability_score'], reverse=True)

        result = {
            "vulnerable_hexes": vulnerable[:10],  # top 10 at risk
            "total_at_risk": len(vulnerable),
            "defense_strategy": _get_defense_strategy(vulnerable)
        }

        cache.set(cache_key, json.dumps(result), ttl=3600)
        return formatter.format_response(success=True, data=result)

    except Exception as e:
        return formatter.format_response(success=False, error=str(e), status_code=500)

def _get_territory_recommendation(expansion_rate, vulnerability, efficiency, hexes):
    """Generate strategic recommendation based on territory metrics"""
    if hexes == 0:
        return "Claim your first hex to start your territory!"
    elif vulnerability > 0.7:
        return "Your territory is under heavy invasion. Focus on defending key hexes."
    elif expansion_rate > 2:
        return "You are expanding fast. Consolidate nearby hexes for better efficiency."
    elif efficiency < 0.3:
        return "Your territory is scattered. Expand toward existing hexes for strength."
    else:
        return "Your territory is healthy. Continue expanding strategically."

def _get_expansion_strategy(path):
    """Determine optimal expansion strategy from path analysis"""
    if not path:
        return "No expansion opportunities found nearby"
    
    opponent_count = len([h for h in path if h['priority_score'] == 10])
    if opponent_count > len(path) / 2:
        return "Aggressive: many opponent hexes to capture."
    else:
        return "Defensive: claim unclaimed hexes and reinforce borders"

def _get_defense_strategy(vulnerable):
    """Generate defense strategy based on vulnerable territories"""
    if not vulnerable:
        return "No vulnerable territories detected. Your territory is secure."
    elif len(vulnerable) > 5:
        return "Critical: multiple territories at risk. Prioritize defending top-risk hexes first."
    else:
        return "Review the vulnerable hexes list and consider reinforcing with nearby runs."

def _hex_distance(hex_a, hex_b):
    """Compatibility wrapper for different h3-py versions."""
    if hasattr(h3, 'h3_distance'):
        return h3.h3_distance(hex_a, hex_b)
    if hasattr(h3, 'grid_distance'):
        return h3.grid_distance(hex_a, hex_b)
    raise ValueError('No compatible distance function found in h3 module')

def _hex_ring(center_hex, ring):
    """Compatibility wrapper for ring/k-ring across h3-py versions."""
    if hasattr(h3, 'h3_ring'):
        return h3.h3_ring(center_hex, ring)
    if hasattr(h3, 'k_ring'):
        return h3.k_ring(center_hex, ring)
    if hasattr(h3, 'grid_ring'):
        return h3.grid_ring(center_hex, ring)
    raise ValueError('No compatible ring function found in h3 module')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
