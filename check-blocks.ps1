# PowerShell script to check if blocks are being created
# Run this while uploading a file to monitor block creation in real-time

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Monitoring Block Creation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will monitor orderer and peer logs for block creation." -ForegroundColor Yellow
Write-Host "Upload a file through the frontend while this is running." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
Write-Host ""

# Function to show recent blocks
function Show-Blocks {
    Write-Host "`n=== ORDERER LOGS (Last 20 lines) ===" -ForegroundColor Green
    docker logs orderer.example.com --tail 20 2>&1 | Select-String -Pattern "Created block|Writing block|Broadcast" | Select-Object -Last 5
    
    Write-Host "`n=== PEER ORG1 LOGS (Last 20 lines) ===" -ForegroundColor Green
    docker logs peer0.org1.example.com --tail 20 2>&1 | Select-String -Pattern "Committed block|endors|CreateRecord|error" | Select-Object -Last 5
}

# Initial check
Show-Blocks

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Watching for new blocks..." -ForegroundColor Yellow
Write-Host "Upload a file now and watch for block [3] or higher!" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Monitor in real-time
$lastBlock = 0
while ($true) {
    Start-Sleep -Seconds 2
    
    # Check orderer for new blocks
    $ordererBlocks = docker logs orderer.example.com --tail 50 2>&1 | Select-String -Pattern "Created block \[(\d+)\]"
    if ($ordererBlocks) {
        $matches = [regex]::Match($ordererBlocks[-1], "Created block \[(\d+)\]")
        if ($matches.Success) {
            $currentBlock = [int]$matches.Groups[1].Value
            if ($currentBlock -gt $lastBlock) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 🎉 NEW BLOCK DETECTED: Block [$currentBlock]" -ForegroundColor Green
                $lastBlock = $currentBlock
                Show-Blocks
            }
        }
    }
    
    # Check peer for committed blocks
    $peerCommits = docker logs peer0.org1.example.com --tail 50 2>&1 | Select-String -Pattern "Committed block \[(\d+)\]"
    if ($peerCommits) {
        $matches = [regex]::Match($peerCommits[-1], "Committed block \[(\d+)\]")
        if ($matches.Success) {
            $committedBlock = [int]$matches.Groups[1].Value
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✅ PEER COMMITTED: Block [$committedBlock]" -ForegroundColor Cyan
        }
    }
}

