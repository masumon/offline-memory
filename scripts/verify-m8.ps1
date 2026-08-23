$ErrorActionPreference = 'Stop'

function Invoke-Step([string]$Name, [scriptblock]$Action) {
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "FAILED: $Name (exit code $LASTEXITCODE)"
  }
  Write-Host "PASS: $Name" -ForegroundColor Green
}

Write-Host '== Offline Memory M8 verification ==' -ForegroundColor Green
Write-Host "Node: $(node --version)"
Write-Host "npm:  $(npm --version)"

Invoke-Step 'TypeScript' { npm exec -- tsc --noEmit }
Invoke-Step 'Lint' { npm run lint }
Invoke-Step 'Jest' { npm test -- --runInBand }
Invoke-Step 'Expo Doctor' { npx expo-doctor }

Write-Host "`nAll static M8 checks passed." -ForegroundColor Green
Write-Host 'Android/device gates still require a real Android runtime.' -ForegroundColor Yellow
