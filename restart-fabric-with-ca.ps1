# Restart Fabric Network with CA Support
# This script restarts the Fabric test network with Certificate Authorities enabled

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Restarting Fabric Network with CA Support" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Change to test-network directory
Set-Location "C:\CDMS_Blockchain\fabric-samples\test-network"

Write-Host "Step 1: Stopping current network..." -ForegroundColor Yellow
wsl bash -c "./network.sh down"

Write-Host ""
Write-Host "Step 2: Starting network with CA..." -ForegroundColor Yellow
wsl bash -c "./network.sh up createChannel -ca"

Write-Host ""
Write-Host "Step 3: Deploying chaincode v1.7 with normal mode (multi-org policy)..." -ForegroundColor Yellow
wsl bash -c "cd /mnt/c/CDMS_Blockchain && bash deploy-chaincode.sh"

Write-Host ""
Write-Host "Step 4: Verifying containers..." -ForegroundColor Green
Write-Host ""
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String -Pattern "ca|peer|orderer"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Fabric Network Ready!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. cd cdms-backend" -ForegroundColor White
Write-Host "  2. npm start" -ForegroundColor White
Write-Host "  3. Try approving users in Access Management" -ForegroundColor White
Write-Host ""
