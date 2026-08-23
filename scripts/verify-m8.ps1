$ErrorActionPreference = 'Stop'

Write-Host '== Offline Memory M8 verification ==' -ForegroundColor Cyan

Write-Host '\n[1/5] Node/npm' -ForegroundColor Yellow
node --version
npm --version

Write-Host '\n[2/5] TypeScript' -ForegroundColor Yellow
npm run typecheck

Write-Host '\n[3/5] Lint' -ForegroundColor Yellow
npm run lint

Write-Host '\n[4/5] Jest' -ForegroundColor Yellow
npm test -- --runInBand

Write-Host '\n[5/5] Expo Doctor' -ForegroundColor Yellow
npx expo-doctor

Write-Host '\nM8 static verification completed.' -ForegroundColor Green
Write-Host 'Android/device gates still require a real Android runtime.' -ForegroundColor Yellow
