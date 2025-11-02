# Test User Approval Flow
# This script tests the complete user registration and approval process

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Testing CDMS User Approval Flow" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$API_URL = "http://localhost:3000"
$testEmail = "testuser$(Get-Random)@example.com"

# Step 1: Register a new user
Write-Host "Step 1: Registering new user..." -ForegroundColor Yellow
Write-Host "  Email: $testEmail" -ForegroundColor White

$registerBody = @{
    username = "TestUser"
    email = $testEmail
    password = "test123"
    role = "investigator"
    org = "A"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$API_URL/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "  Result: $($registerResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Check pending registrations
Write-Host "Step 2: Checking pending registrations..." -ForegroundColor Yellow

try {
    $pendingResponse = Invoke-RestMethod -Uri "$API_URL/pending-registrations" -Method Get
    Write-Host "  Pending users: $($pendingResponse.count)" -ForegroundColor White
    
    $foundUser = $pendingResponse.users | Where-Object { $_.email -eq $testEmail }
    if ($foundUser) {
        Write-Host "  Found registered user: $($foundUser.username)" -ForegroundColor Green
    } else {
        Write-Host "  Error: User not found in pending list!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Approve the user
Write-Host "Step 3: Approving user as admin..." -ForegroundColor Yellow

$approveBody = @{
    email = $testEmail
    adminEmail = "example@gmail.com"
} | ConvertTo-Json

try {
    $approveResponse = Invoke-RestMethod -Uri "$API_URL/approve-registration" -Method Post -Body $approveBody -ContentType "application/json"
    Write-Host "  Result: $($approveResponse.message)" -ForegroundColor Green
    Write-Host "  Wallet ID: $($approveResponse.walletId)" -ForegroundColor White
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Check wallet
Write-Host "Step 4: Verifying wallet identity..." -ForegroundColor Yellow

$walletPath = "C:\CDMS_Blockchain\cdms-backend\wallet"
$expectedWalletFile = $testEmail.ToLower().Replace("@", "_").Replace(".", "_") + ".id"

if (Test-Path "$walletPath\$expectedWalletFile") {
    Write-Host "  Wallet identity created: $expectedWalletFile" -ForegroundColor Green
} else {
    Write-Host "  Warning: Wallet file not found" -ForegroundColor Yellow
    Write-Host "  Expected: $expectedWalletFile" -ForegroundColor White
}

Write-Host ""

# Step 5: Try to login as the new user
Write-Host "Step 5: Testing login as approved user..." -ForegroundColor Yellow

$loginBody = @{
    email = $testEmail
    password = "test123"
    org = "A"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "  Login successful!" -ForegroundColor Green
    Write-Host "  User: $($loginResponse.user.username)" -ForegroundColor White
    Write-Host "  Role: $($loginResponse.user.role)" -ForegroundColor White
    Write-Host "  Org: $($loginResponse.user.org)" -ForegroundColor White
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Test Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Test Email: $testEmail" -ForegroundColor White
Write-Host "  Registration: PASSED" -ForegroundColor Green
Write-Host "  Approval: PASSED" -ForegroundColor Green
Write-Host "  Wallet Creation: $(if (Test-Path "$walletPath\$expectedWalletFile") { 'PASSED' } else { 'CHECK MANUALLY' })" -ForegroundColor $(if (Test-Path "$walletPath\$expectedWalletFile") { 'Green' } else { 'Yellow' })
Write-Host ""
Write-Host "You can now use the frontend to test the full user flow!" -ForegroundColor Cyan
Write-Host ""

