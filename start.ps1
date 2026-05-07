# Relec Invoicer — start script
# Set your Gemini API key here or in your environment
# $env:GEMINI_API_KEY = "AIza..."

if (-not $env:GEMINI_API_KEY) {
    Write-Host ""
    Write-Host "  ERROR: GEMINI_API_KEY is not set." -ForegroundColor Red
    Write-Host "  Set it first:" -ForegroundColor Yellow
    Write-Host '  $env:GEMINI_API_KEY = "AIza..."' -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "  Starting Relec Invoicer..." -ForegroundColor Cyan
Write-Host "  Open: http://localhost:3001" -ForegroundColor Green
Write-Host ""
node "$PSScriptRoot\server.js"
