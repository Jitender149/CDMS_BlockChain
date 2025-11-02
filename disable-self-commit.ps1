# PowerShell script to disable self-commit mode

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Disabling Self-Commit Mode" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$backendEnvPath = "cdms-backend\.env"

if (-not (Test-Path $backendEnvPath)) {
    Write-Host "⚠️ .env file not found. Self-commit mode may not be enabled." -ForegroundColor Yellow
    exit 0
}

# Read existing .env file
$envContent = Get-Content $backendEnvPath
$newContent = @()

foreach ($line in $envContent) {
    if ($line -match "^SELF_COMMIT=") {
        $newContent += "SELF_COMMIT=false"
    } else {
        $newContent += $line
    }
}

# Write updated content
$newContent | Set-Content $backendEnvPath

Write-Host "✅ Self-commit mode disabled" -ForegroundColor Green
Write-Host ""
Write-Host "Restart backend server to apply changes" -ForegroundColor Yellow

