# Relec Invoicer — start script
# Set your Anthropic API key here or in your environment
# $env:ANTHROPIC_API_KEY = "sk-ant-..."

if (-not $env:ANTHROPIC_API_KEY) {
    Write-Host ""
    Write-Host "  ERROR: ANTHROPIC_API_KEY is not set." -ForegroundColor Red
    Write-Host "  Set it first:" -ForegroundColor Yellow
    Write-Host '  $env:ANTHROPIC_API_KEY = "sk-ant-..."' -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "  Starting Relec Invoicer..." -ForegroundColor Cyan
Write-Host "  Open: http://localhost:3001" -ForegroundColor Green
Write-Host ""
node "$PSScriptRoot\server.js"
