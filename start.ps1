# Relec Invoicer — start script
# $env:OPENAI_API_KEY = "sk-..."

if (-not $env:OPENAI_API_KEY) {
    Write-Host ""
    Write-Host "  ERROR: OPENAI_API_KEY is not set." -ForegroundColor Red
    Write-Host "  Set it first:" -ForegroundColor Yellow
    Write-Host '  $env:OPENAI_API_KEY = "sk-..."' -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "  Starting Relec Invoicer..." -ForegroundColor Cyan
Write-Host "  Open: http://localhost:3001" -ForegroundColor Green
Write-Host ""
node "$PSScriptRoot\server.js"
