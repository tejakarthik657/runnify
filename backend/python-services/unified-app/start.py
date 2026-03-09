#!/usr/bin/env python3
"""
Startup script for unified Python services gateway
Run this to start all 13 services in one process
"""
import os
import sys

# Set environment variables for local development
os.environ.setdefault("DATABASE_URL", os.getenv("MONGODB_URI", ""))
os.environ.setdefault("REDIS_URL", os.getenv("UPSTASH_REDIS_URL", ""))
os.environ.setdefault("PORT", "8000")

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("Territory Run - Unified Python Services")
    print("=" * 60)
    print("Starting all 13 microservices in one process...")
    print("Port: 8000")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload for development
        log_level="info"
    )
