# PowerShell script to enable self-commit mode for local testing
# FOR TESTING ONLY - NOT FOR PRODUCTION

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Enabling Self-Commit Mode" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Set SELF_COMMIT environment variable in backend .env file
$backendEnvPath = "cdms-backend\.env"

if (-not (Test-Path $backendEnvPath)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item "cdms-backend\env.example" $backendEnvPath -ErrorAction SilentlyContinue
}

# Read existing .env file
$envContent = Get-Content $backendEnvPath -ErrorAction SilentlyContinue

# Check if SELF_COMMIT is already set
$selfCommitExists = $false
$newContent = @()

foreach ($line in $envContent) {
    if ($line -match "^SELF_COMMIT=") {
        $newContent += "SELF_COMMIT=true"
        $selfCommitExists = $true
    } else {
        $newContent += $line
    }
}

# Add SELF_COMMIT if it doesn't exist
if (-not $selfCommitExists) {
    $newContent += "SELF_COMMIT=true"
}

# Write updated content
$newContent | Set-Content $backendEnvPath

Write-Host "✅ Self-commit mode enabled in backend configuration" -ForegroundColor Green
Write-Host ""
Write-Host "To apply changes:" -ForegroundColor Yellow
Write-Host "1. Restart backend server: npm start (in cdms-backend)" -ForegroundColor Yellow
Write-Host "2. Check backend logs for '[SELF-COMMIT]' messages" -ForegroundColor Yellow
Write-Host ""
Write-Host "To disable self-commit mode, run: disable-self-commit.ps1" -ForegroundColor Yellow

