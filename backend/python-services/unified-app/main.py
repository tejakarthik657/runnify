"""
Unified Python Services Gateway
Combines all 13 microservices into a single FastAPI application
Dynamically loads and mounts each service's routes
"""
import sys
import os
from pathlib import Path

# Add parent and service directories to Python path
BASE_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import time
import importlib
import traceback

app = FastAPI(
    title="Territory Run - Unified Python Services",
    description="All Python microservices in one deployment",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Service directories and their route prefixes
SERVICES = [
    ("01-run-statistics", "stats"),
    ("02-hex-analyzer", "hex"),
    ("03-engagement-engine", "engagement"),
    ("04-leaderboard-predictor", "leaderboard"),
    ("05-territory-analyzer", "territory"),
    ("06-route-optimization", "routes"),
    ("07-elevation-analyzer", "elevation"),
    ("08-heatmap-generator", "heatmap"),
    ("11-badge-generator", "badges"),
    ("16-challenge-recommender", "challenges"),
    ("17-run-name-generator", "names"),
    ("18-streak-calculator", "streak"),
    ("19-credit-optimizer", "credits"),
]

loaded_services = []
failed_services = []

# Dynamically import and mount each service
for service_dir, route_prefix in SERVICES:
    try:
        # Change to service directory for imports to work
        service_path = BASE_DIR / service_dir
        if not service_path.exists():
            failed_services.append((route_prefix, "Directory not found"))
            continue
            
        # Add service directory to path temporarily
        sys.path.insert(0, str(service_path))
        
        # Import the main module
        spec = importlib.util.spec_from_file_location(
            f"{service_dir}.main",
            service_path / "main.py"
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        # Mount the service app
        if hasattr(module, 'app'):
            app.mount(f"/{route_prefix}", module.app)
            loaded_services.append(route_prefix)
            print(f"✓ Mounted /{route_prefix} from {service_dir}")
        else:
            failed_services.append((route_prefix, "No app attribute"))
            print(f"✗ {service_dir} has no 'app' attribute")
            
    except Exception as e:
        failed_services.append((route_prefix, str(e)))
        print(f"✗ Failed to load {service_dir}: {e}")
        traceback.print_exc()
    finally:
        # Remove service directory from path
        if str(service_path) in sys.path:
            sys.path.remove(str(service_path))

# Root health check
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "loaded_services": loaded_services,
        "failed_services": dict(failed_services) if failed_services else {},
        "total_loaded": len(loaded_services),
        "timestamp": time.time()
    }

@app.get("/")
async def root():
    return {
        "message": "Territory Run Unified Python Services",
        "loaded_services": loaded_services,
        "failed_services": dict(failed_services) if failed_services else {},
        "routes": {
            "health": "/health",
            "docs": "/docs",
            "services": {name: f"/{name}/*" for name in loaded_services}
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
