# PowerShell script to start MinIO for CDMS Blockchain
# Run this before starting the backend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting MinIO for CDMS Blockchain   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "[1/4] Checking Docker status..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host "Docker is running" -ForegroundColor Green
Write-Host ""

# Stop existing MinIO container if running
Write-Host "[2/4] Stopping existing MinIO containers..." -ForegroundColor Yellow
docker stop cdms-minio 2>$null
docker stop cdms-minio-mc 2>$null
docker rm cdms-minio 2>$null
docker rm cdms-minio-mc 2>$null
Write-Host "Cleanup complete" -ForegroundColor Green
Write-Host ""

# Start MinIO with docker-compose
Write-Host "[3/4] Starting MinIO services..." -ForegroundColor Yellow
docker-compose -f docker-compose-minio.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start MinIO!" -ForegroundColor Red
    exit 1
}
Write-Host "MinIO services started successfully" -ForegroundColor Green
Write-Host ""

# Wait for MinIO to be ready
Write-Host "[4/4] Waiting for MinIO to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if MinIO is accessible
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9000/minio/health/live" -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "MinIO is ready and healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "WARNING: Could not verify MinIO health, but it may still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MinIO Started Successfully!          " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access MinIO:" -ForegroundColor White
Write-Host "  - API:     http://localhost:9000" -ForegroundColor Cyan
Write-Host "  - Console: http://localhost:9001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor White
Write-Host "  - Username: minioadmin" -ForegroundColor Cyan
Write-Host "  - Password: minioadmin" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "  1. Start the backend: cd cdms-backend && npm start" -ForegroundColor Yellow
Write-Host "  2. Start the frontend: cd cdms-frontend && npm run dev" -ForegroundColor Yellow
Write-Host "  3. Login and upload files!" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop MinIO: docker-compose -f docker-compose-minio.yml down" -ForegroundColor Gray
Write-Host ""

