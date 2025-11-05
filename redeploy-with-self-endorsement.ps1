# Redeploy Chaincode with Single-Org Endorsement Policy for Self-Endorsement
# This script redeploys the chaincode with OR('Org1MSP.member') policy
# allowing single-org endorsement and direct block creation

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Redeploy Chaincode with Self-Endorsement" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if WSL is available
Write-Host "[1/4] Checking WSL availability..." -ForegroundColor Yellow
$wslCheck = wsl --list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ WSL not found. Please install WSL first." -ForegroundColor Red
    exit 1
}
Write-Host "✓ WSL found" -ForegroundColor Green
Write-Host ""

# Navigate to project directory in WSL
Write-Host "[2/4] Navigating to project directory..." -ForegroundColor Yellow
$projectPath = "/mnt/c/CDMS_Blockchain"
Write-Host "  Project path: $projectPath" -ForegroundColor Gray
Write-Host ""

# Install chaincode dependencies
Write-Host "[3/4] Installing chaincode dependencies..." -ForegroundColor Yellow
wsl bash -c "cd $projectPath/chaincode && npm install"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install chaincode dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Deploy chaincode with single-org policy
Write-Host "[4/4] Deploying chaincode with single-org endorsement policy..." -ForegroundColor Yellow
Write-Host "  Policy: OR('Org1MSP.member') - Allows self-endorsement" -ForegroundColor Gray
Write-Host "  Version: 1.6" -ForegroundColor Gray
Write-Host ""

wsl bash "$projectPath/deploy-chaincode.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ Chaincode Redeployed Successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Set environment variable: `$env:SELF_COMMIT='true'" -ForegroundColor White
    Write-Host "  2. Restart backend: cd cdms-backend && npm start" -ForegroundColor White
    Write-Host "  3. Test upload - blocks should now be created directly!" -ForegroundColor White
    Write-Host ""
    Write-Host "To verify blocks are being created:" -ForegroundColor Yellow
    Write-Host "  docker logs orderer.example.com | Select-String -Pattern 'Created block|Writing block'" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ❌ Chaincode Deployment Failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Ensure Docker containers are running: docker ps" -ForegroundColor White
    Write-Host "  2. Check network is up: docker ps | Select-String peer0" -ForegroundColor White
    Write-Host "  3. Try manually in WSL: bash deploy-chaincode.sh" -ForegroundColor White
    Write-Host ""
    exit 1
}


