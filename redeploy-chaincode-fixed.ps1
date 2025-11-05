# PowerShell script to redeploy chaincode with RBAC fixes
# This deploys the updated chaincode that allows operations in test mode

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Redeploying Chaincode with RBAC Fixes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "⚠️  IMPORTANT: Run this in WSL, not PowerShell!" -ForegroundColor Yellow
Write-Host ""
Write-Host "In WSL terminal, run:" -ForegroundColor Yellow
Write-Host "  cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network" -ForegroundColor White
Write-Host "  ./network.sh deployCC -ccn cdmscontract -ccp ../../chaincode -ccl javascript -ccv 1.5" -ForegroundColor White
Write-Host ""
Write-Host "After redeployment:" -ForegroundColor Yellow
Write-Host "  1. Upload a file through the frontend" -ForegroundColor White
Write-Host "  2. Check orderer logs for 'Created block [3]'" -ForegroundColor White
Write-Host "  3. Check peer logs for 'Committed block [3]'" -ForegroundColor White
Write-Host ""
Write-Host "Expected changes after redeployment:" -ForegroundColor Green
Write-Host "  ✅ Chaincode queries will work (test mode enabled)" -ForegroundColor Green
Write-Host "  ✅ Transactions will pass endorsement" -ForegroundColor Green
Write-Host "  ✅ Transactions will reach orderer" -ForegroundColor Green
Write-Host "  ✅ Orderer will create blocks immediately (if BATCHTIMEOUT=0s)" -ForegroundColor Green

