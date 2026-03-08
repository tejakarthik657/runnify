# Lightweight Python Microservices - Shared Utilities
# Zero GPU, Free APIs Only, Production-Ready

import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import redis


class DatabaseConnection:
    """Lightweight PostgreSQL connection manager"""
    
    def __init__(self):
        self.conn_string = os.getenv('DATABASE_URL', 'postgresql://localhost/runni5')
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict]:
        """Execute SELECT query and return results"""
        try:
            conn = psycopg2.connect(self.conn_string)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(query, params)
            results = [dict(row) for row in cursor.fetchall()]
            cursor.close()
            conn.close()
            return results
        except Exception as e:
            print(f"Database query error: {e}")
            return []
    
    def execute_update(self, query: str, params: tuple = None) -> int:
        """Execute INSERT/UPDATE/DELETE and return affected rows"""
        try:
            conn = psycopg2.connect(self.conn_string)
            cursor = conn.cursor()
            cursor.execute(query, params)
            affected = cursor.rowcount
            conn.commit()
            cursor.close()
            conn.close()
            return affected
        except Exception as e:
            print(f"Database update error: {e}")
            return 0


class CacheManager:
    """Redis caching wrapper - simple and fast"""
    
    def __init__(self):
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        try:
            value = self.redis_client.get(key)
            return json.loads(value) if value else None
        except:
            return None
    
    def set(self, key: str, value: Any, ttl: int = 3600):
        """Set cached value with TTL (seconds)"""
        try:
            self.redis_client.setex(key, ttl, json.dumps(value))
            return True
        except:
            return False
    
    def delete(self, key: str):
        """Delete cached key"""
        try:
            self.redis_client.delete(key)
            return True
        except:
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        try:
            return self.redis_client.exists(key) > 0
        except:
            return False


class ResponseFormatter:
    """Standardized API responses"""
    
    @staticmethod
    def success(data: Any, message: str = "Success") -> Dict:
        """Format success response"""
        return {
            "success": True,
            "message": message,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def error(message: str, code: int = 400) -> Dict:
        """Format error response"""
        return {
            "success": False,
            "message": message,
            "code": code,
            "timestamp": datetime.utcnow().isoformat()
        }


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS points in kilometers
    Simple spherical law of cosines (accurate for most cases)
    """
    from math import radians, cos, sin, asin, sqrt
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371  # Earth radius in kilometers
    
    return c * r


def calculate_pace(distance_km: float, time_seconds: int) -> str:
    """Calculate running pace in min/km format"""
    if distance_km <= 0:
        return "0:00"
    
    minutes_per_km = (time_seconds / 60) / distance_km
    mins = int(minutes_per_km)
    secs = int((minutes_per_km - mins) * 60)
    
    return f"{mins}:{secs:02d}"


def estimate_calories(distance_km: float, weight_kg: float = 70) -> int:
    """
    Estimate calories burned
    Simple formula: 0.63 * weight * distance
    """
    return int(0.63 * weight_kg * distance_km)


# Initialize shared instances
db = DatabaseConnection()
cache = CacheManager()
formatter = ResponseFormatter()
