# deploy-chaincode.ps1 - Deploy CDMS chaincode (PowerShell wrapper for WSL)
# Run this script from PowerShell in the project root

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  CDMS Chaincode Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if WSL is available
try {
    $wslCheck = wsl --list --quiet 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ WSL is not available or not properly configured" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install WSL first:" -ForegroundColor Yellow
        Write-Host "  1. Open PowerShell as Administrator"
        Write-Host "  2. Run: wsl --install"
        Write-Host "  3. Restart computer"
        Write-Host "  4. Run this script again"
        exit 1
    }
} catch {
    Write-Host "❌ WSL is not available" -ForegroundColor Red
    exit 1
}

Write-Host "✓ WSL detected" -ForegroundColor Green
Write-Host ""

# Get the current directory in WSL format
$currentDir = (Get-Location).Path
$wslPath = $currentDir -replace '^([A-Z]):', {'/mnt/' + $_.Groups[1].Value.ToLower()} -replace '\\', '/'

Write-Host "Converting path for WSL..." -ForegroundColor Yellow
Write-Host "Windows path: $currentDir"
Write-Host "WSL path:     $wslPath"
Write-Host ""

Write-Host "Installing chaincode dependencies..." -ForegroundColor Yellow
Push-Location chaincode
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install chaincode dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "Deploying chaincode via WSL..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Write-Host ""

# Run the deployment in WSL
wsl bash -c "cd '$wslPath' && bash deploy-chaincode.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "  ✅ Deployment Complete!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Restart the backend server"
    Write-Host "  2. Test login: node cdms-backend\test-login-final.js"
    Write-Host "  3. Or use the frontend at http://localhost:5173"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "  ❌ Deployment Failed" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  • Docker not running: Start Docker Desktop"
    Write-Host "  • Network not up: cd fabric-samples\test-network && wsl ./network.sh up createChannel"
    Write-Host "  • Line endings: Run dos2unix deploy-chaincode.sh in WSL"
    Write-Host ""
    exit 1
}

