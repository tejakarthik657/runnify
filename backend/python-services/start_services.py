#!/usr/bin/env python3
"""
Start all Python microservices for Territory Run
Runs each service on its designated port in the background
"""

import os
import sys
import subprocess
import time
from pathlib import Path

# Service definitions: (directory_name, port)
SERVICES = [
    ('01-run-statistics', 8001),
    ('02-hex-analyzer', 8002),
    ('03-engagement-engine', 8003),
    ('04-leaderboard-predictor', 8004),
    ('05-territory-analyzer', 8005),
    ('06-route-optimization', 8006),
    ('07-elevation-analyzer', 8007),
    ('08-heatmap-generator', 8008),
    ('11-badge-generator', 8011),
    ('16-challenge-recommender', 8016),
    ('17-run-name-generator', 8017),
    ('18-streak-calculator', 8018),
    ('19-credit-optimizer', 8019),
]

def check_python():
    """Check if Python is available"""
    try:
        result = subprocess.run([sys.executable, '--version'], capture_output=True, text=True)
        print(f"✓ Using Python: {result.stdout.strip()}")
        return True
    except Exception as e:
        print(f"✗ Python not found: {e}")
        return False

def install_requirements():
    """Install required packages"""
    print("\n📦 Installing Python dependencies...")
    requirements_path = Path(__file__).parent / 'requirements.txt'
    
    try:
        subprocess.run(
            [sys.executable, '-m', 'pip', 'install', '-r', str(requirements_path)],
            check=True
        )
        print("✓ Dependencies installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install dependencies: {e}")
        return False

def start_service(service_dir, port):
    """Start a single Python service"""
    service_path = Path(__file__).parent / service_dir / 'main.py'
    
    if not service_path.exists():
        print(f"✗ Service not found: {service_path}")
        return None
    
    print(f"Starting {service_dir} on port {port}...")
    
    try:
        # Start service in background
        process = subprocess.Popen(
            [sys.executable, str(service_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(service_path.parent)
        )
        
        # Give it a moment to start
        time.sleep(1)
        
        # Check if it's still running
        if process.poll() is None:
            print(f"✓ {service_dir} started (PID: {process.pid})")
            return process
        else:
            stderr = process.stderr.read().decode()
            print(f"✗ {service_dir} failed to start: {stderr}")
            return None
    except Exception as e:
        print(f"✗ Error starting {service_dir}: {e}")
        return None

def main():
    """Main startup routine"""
    print("=" * 60)
    print("🚀 TERRITORY RUN - Python Microservices Launcher")
    print("=" * 60)
    
    # Check Python
    if not check_python():
        sys.exit(1)
    
    # Install dependencies
    if not install_requirements():
        print("\n⚠️  Continuing despite dependency issues...")
    
    # Start all services
    processes = []
    print("\n🔧 Starting services...")
    print("-" * 60)
    
    for service_dir, port in SERVICES:
        process = start_service(service_dir, port)
        if process:
            processes.append((service_dir, port, process))
        time.sleep(0.5)  # Stagger startups
    
    # Summary
    print("\n" + "=" * 60)
    print(f"✅ Started {len(processes)}/{len(SERVICES)} services")
    print("=" * 60)
    
    if processes:
        print("\n📊 Running Services:")
        for service_dir, port, process in processes:
            print(f"  • {service_dir:30} → http://localhost:{port}")
        
        print("\n💡 API Gateway Proxy Routes:")
        print("  • /python/stats/*       → Run Statistics (8001)")
        print("  • /python/hex/*         → Hex Analyzer (8002)")
        print("  • /python/engagement/*  → Engagement Engine (8003)")
        print("  • /python/leaderboard/* → Leaderboard Predictor (8004)")
        print("  • /python/territory/*   → Territory Analyzer (8005)")
        print("  • /python/routes/*      → Route Optimizer (8006)")
        print("  • /python/elevation/*   → Elevation Analyzer (8007)")
        print("  • /python/heatmap/*     → Heatmap Generator (8008)")
        print("  • /python/badges/*      → Badge Generator (8011)")
        print("  • /python/challenges/*  → Challenge Recommender (8016)")
        print("  • /python/names/*       → Name Generator (8017)")
        print("  • /python/streak/*      → Streak Calculator (8018)")
        print("  • /python/credits/*     → Credit Optimizer (8019)")
        
        print("\n📝 Health Check: http://localhost:8001/health")
        print("\n⚠️  Press Ctrl+C to stop all services\n")
        
        try:
            # Wait for Ctrl+C
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n\n🛑 Shutting down services...")
            for service_dir, port, process in processes:
                print(f"  Stopping {service_dir}...")
                process.terminate()
                process.wait(timeout=5)
            print("✓ All services stopped")
    else:
        print("\n✗ No services started successfully")
        sys.exit(1)

if __name__ == '__main__':
    main()
