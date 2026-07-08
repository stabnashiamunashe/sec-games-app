#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

Write-Host "Step 1: Extracting certificate chain..." -ForegroundColor Cyan
node "$PSScriptRoot\get-cert.mjs"

$certPath = "C:\certs\worldcup26-chain.pem"
if (-not (Test-Path $certPath)) {
    Write-Host "Cert file was not created. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 2: Setting NODE_EXTRA_CA_CERTS machine-wide..." -ForegroundColor Cyan
[System.Environment]::SetEnvironmentVariable("NODE_EXTRA_CA_CERTS", $certPath, "Machine")

Write-Host "`nStep 3: Verifying in a fresh process..." -ForegroundColor Cyan
$env:NODE_EXTRA_CA_CERTS = $certPath   # apply to this session too, for immediate test
$testResult = node -e "fetch('https://worldcup26.ir/get/games').then(r => console.log('SUCCESS status:', r.status)).catch(e => { console.error('STILL FAILING:', e.message); process.exit(1); })"

Write-Host "`nDone. NOTE: existing running services (IIS, PM2, Docker, Windows Service) won't see the new machine env var until restarted." -ForegroundColor Yellow
Write-Host "Restart your Node app/service now for the fix to take effect in production." -ForegroundColor Yellow