# PowerShell script to add channel and orderer information to connection profiles
# This fixes the "Channel: Not found" issue

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing Connection Profiles" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$org1Path = "fabric-samples\test-network\organizations\peerOrganizations\org1.example.com\connection-org1.json"
$org2Path = "fabric-samples\test-network\organizations\peerOrganizations\org2.example.com\connection-org2.json"

function AddChannelAndOrderer($profilePath, $orgNumber) {
    if (-not (Test-Path $profilePath)) {
        Write-Host "⚠️  Connection profile not found: $profilePath" -ForegroundColor Yellow
        return $false
    }

    Write-Host "📝 Fixing connection profile: $profilePath" -ForegroundColor Yellow
    
    $profile = Get-Content $profilePath | ConvertFrom-Json
    
    # Add channels section if missing
    if (-not $profile.channels) {
        $profile | Add-Member -MemberType NoteProperty -Name "channels" -Value @{} -Force
    }
    
    # Add mychannel configuration
    $profile.channels.mychannel = @{
        orderers = @("orderer.example.com")
        peers = @{
            "peer0.org$orgNumber.example.com" = @{
                endorsingPeer = $true
                chaincodeQuery = $true
                ledgerQuery = $true
                eventSource = $true
            }
        }
    }
    
    # Add orderers section if missing
    if (-not $profile.orderers) {
        $profile | Add-Member -MemberType NoteProperty -Name "orderers" -Value @{} -Force
    }
    
    # Add orderer configuration
    $profile.orderers."orderer.example.com" = @{
        url = "grpcs://localhost:7050"
        tlsCACerts = @{
            pem = $profile.peers."peer0.org$orgNumber.example.com".tlsCACerts.pem
        }
        grpcOptions = @{
            "ssl-target-name-override" = "orderer.example.com"
            "hostnameOverride" = "orderer.example.com"
        }
    }
    
    # Save updated profile
    $profile | ConvertTo-Json -Depth 10 | Set-Content $profilePath -Encoding UTF8
    
    Write-Host "✅ Fixed connection profile: $profilePath" -ForegroundColor Green
    return $true
}

# Fix Org1 profile
if (AddChannelAndOrderer $org1Path 1) {
    Write-Host "✅ Org1 connection profile fixed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not fix Org1 connection profile" -ForegroundColor Yellow
}

# Fix Org2 profile
if (AddChannelAndOrderer $org2Path 2) {
    Write-Host "✅ Org2 connection profile fixed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not fix Org2 connection profile" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Connection profiles updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart backend server if it's running" -ForegroundColor Yellow
Write-Host "2. Check backend logs for 'Channel: mychannel' (should now show correctly)" -ForegroundColor Yellow
Write-Host "3. Verify chaincode is deployed: docker ps | findstr chaincode" -ForegroundColor Yellow

