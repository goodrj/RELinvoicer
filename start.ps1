Set-Location $PSScriptRoot

if (-not (Test-Path -LiteralPath ".env")) {
  Copy-Item -LiteralPath ".env.example" -Destination ".env"
  Write-Host "Created .env. Add your OPENAI_API_KEY, then run this script again." -ForegroundColor Yellow
  notepad ".env"
  exit 1
}

npm start
