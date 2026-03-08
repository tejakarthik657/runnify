# PowerShell script to start all Python microservices
# Territory Run - Python Services Launcher
# Usage: .\start_services.ps1

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host "🚀 TERRITORY RUN - Python Microservices Launcher" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Cyan

# Check Python
Write-Host "`n📍 Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Using: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
try {
    python -m pip install -r requirements.txt --quiet
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Some dependencies may have failed. Continuing..." -ForegroundColor Yellow
}

# Define services
$services = @(
    @{Name="01-run-statistics"; Port=8001},
    @{Name="02-hex-analyzer"; Port=8002},
    @{Name="03-engagement-engine"; Port=8003},
    @{Name="04-leaderboard-predictor"; Port=8004},
    @{Name="06-route-optimization"; Port=8006},
    @{Name="11-badge-generator"; Port=8011},
    @{Name="16-challenge-recommender"; Port=8016},
    @{Name="17-run-name-generator"; Port=8017},
    @{Name="18-streak-calculator"; Port=8018},
    @{Name="19-credit-optimizer"; Port=8019}
)

Write-Host "`n🔧 Starting services..." -ForegroundColor Yellow
Write-Host ("-" * 60) -ForegroundColor Gray

$jobs = @()

foreach ($service in $services) {
    $servicePath = Join-Path $PSScriptRoot $service.Name "main.py"
    
    if (Test-Path $servicePath) {
        Write-Host "Starting $($service.Name) on port $($service.Port)..." -ForegroundColor Cyan
        
        # Start service in background job
        $job = Start-Job -ScriptBlock {
            param($path, $dir)
            Set-Location $dir
            python $path
        } -ArgumentList $servicePath, (Split-Path $servicePath)
        
        $jobs += @{Name=$service.Name; Port=$service.Port; Job=$job}
        Start-Sleep -Milliseconds 500
    } else {
        Write-Host "✗ Service not found: $servicePath" -ForegroundColor Red
    }
}

# Wait a moment for services to start
Start-Sleep -Seconds 2

Write-Host "`n" -NoNewline
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "✅ Started $($jobs.Count)/$($services.Count) services" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Cyan

if ($jobs.Count -gt 0) {
    Write-Host "`n📊 Running Services:" -ForegroundColor Yellow
    foreach ($job in $jobs) {
        $status = if ($job.Job.State -eq "Running") { "✓" } else { "✗" }
        Write-Host "  $status $($job.Name.PadRight(30)) → http://localhost:$($job.Port)" -ForegroundColor $(if ($job.Job.State -eq "Running") { "Green" } else { "Red" })
    }
    
    Write-Host "`n💡 API Gateway Proxy Routes:" -ForegroundColor Yellow
    Write-Host "  • /python/stats/*       → Run Statistics (8001)" -ForegroundColor Gray
    Write-Host "  • /python/hex/*         → Hex Analyzer (8002)" -ForegroundColor Gray
    Write-Host "  • /python/engagement/*  → Engagement Engine (8003)" -ForegroundColor Gray
    Write-Host "  • /python/leaderboard/* → Leaderboard Predictor (8004)" -ForegroundColor Gray
    Write-Host "  • /python/routes/*      → Route Optimizer (8006)" -ForegroundColor Gray
    Write-Host "  • /python/badges/*      → Badge Generator (8011)" -ForegroundColor Gray
    Write-Host "  • /python/challenges/*  → Challenge Recommender (8016)" -ForegroundColor Gray
    Write-Host "  • /python/names/*       → Name Generator (8017)" -ForegroundColor Gray
    Write-Host "  • /python/streak/*      → Streak Calculator (8018)" -ForegroundColor Gray
    Write-Host "  • /python/credits/*     → Credit Optimizer (8019)" -ForegroundColor Gray
    
    Write-Host "`n📝 Health Check: http://localhost:8001/health" -ForegroundColor Cyan
    Write-Host "⚠️  Press Ctrl+C to stop all services`n" -ForegroundColor Yellow
    
    # Keep script running and monitor jobs
    try {
        while ($true) {
            Start-Sleep -Seconds 1
            
            # Check if any jobs have failed
            foreach ($job in $jobs) {
                if ($job.Job.State -ne "Running") {
                    Write-Host "`n⚠️  Service $($job.Name) stopped unexpectedly" -ForegroundColor Red
                }
            }
        }
    } finally {
        Write-Host "`n`n🛑 Shutting down services..." -ForegroundColor Yellow
        foreach ($job in $jobs) {
            Write-Host "  Stopping $($job.Name)..." -ForegroundColor Gray
            Stop-Job -Job $job.Job
            Remove-Job -Job $job.Job -Force
        }
        Write-Host "✓ All services stopped" -ForegroundColor Green
    }
} else {
    Write-Host "`n✗ No services started successfully" -ForegroundColor Red
    exit 1
}
