# PowerShell script to debug "No valid responses from any peers" error

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Debugging Endorsement Issue" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Checking chaincode deployment..." -ForegroundColor Yellow
$chaincodeCheck = docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel 2>&1
Write-Host $chaincodeCheck

Write-Host "`nStep 2: Checking peer status..." -ForegroundColor Yellow
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String -Pattern "peer|orderer"

Write-Host "`nStep 3: Checking for chaincode errors in peer logs..." -ForegroundColor Yellow
docker logs peer0.org1.example.com --tail 100 | Select-String -Pattern "chaincode|cdmscontract|error|endors" | Select-Object -Last 20

Write-Host "`nStep 4: Checking orderer for transaction broadcasts..." -ForegroundColor Yellow
docker logs orderer.example.com --tail 100 | Select-String -Pattern "Broadcast|envelope|transaction" | Select-Object -Last 10

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Diagnosis:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If chaincode version is NOT 1.5:" -ForegroundColor Yellow
Write-Host "  → Chaincode needs to be redeployed with RBAC fixes" -ForegroundColor White
Write-Host "  → Run: .\restart-fabric-with-ca.ps1" -ForegroundColor White
Write-Host ""
Write-Host "If you see 'endorsement policy' errors:" -ForegroundColor Yellow
Write-Host "  → Check endorsement policy in channel config" -ForegroundColor White
Write-Host ""
Write-Host "If you see 'chaincode not found' errors:" -ForegroundColor Yellow
Write-Host "  → Chaincode needs to be installed/deployed" -ForegroundColor White
Write-Host ""
Write-Host "If no errors in peer logs but transactions fail:" -ForegroundColor Yellow
Write-Host "  → Chaincode execution is failing silently" -ForegroundColor White
Write-Host "  → Redeploy chaincode with verbose logging" -ForegroundColor White

