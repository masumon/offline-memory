$ErrorActionPreference = 'Stop'

Write-Host '== Offline Memory local verification ==' -ForegroundColor Cyan

Write-Host '`n[1/5] Git working tree' -ForegroundColor Yellow
git status --short

Write-Host '`n[2/5] TypeScript' -ForegroundColor Yellow
npm run typecheck

Write-Host '`n[3/5] ESLint' -ForegroundColor Yellow
npm run lint

Write-Host '`n[4/5] Jest' -ForegroundColor Yellow
npm test -- --runInBand

Write-Host '`n[5/5] Android debug build and runtime' -ForegroundColor Yellow
$androidDir = Join-Path $PSScriptRoot '..\android'
Push-Location $androidDir
try {
  & .\gradlew.bat :app:assembleDebug --no-daemon
  if ($LASTEXITCODE -ne 0) { throw 'Android debug build failed.' }
} finally {
  Pop-Location
}

$apk = Join-Path $PSScriptRoot '..\android\app\build\outputs\apk\debug\app-debug.apk'
$apk = [System.IO.Path]::GetFullPath($apk)
if (-not (Test-Path $apk)) { throw "Expected debug APK was not produced: $apk" }

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  Write-Host 'Android debug build passed. ADB is not installed or is not on PATH, so device runtime verification was skipped.' -ForegroundColor DarkYellow
  exit 0
}

$devices = @(adb devices | Select-String '\sdevice$')
if ($devices.Count -eq 0) {
  Write-Host 'Android debug build passed. No online Android device/emulator detected, so runtime verification was skipped.' -ForegroundColor DarkYellow
  exit 0
}

Write-Host "Installing $apk" -ForegroundColor Gray
adb install -r $apk
if ($LASTEXITCODE -ne 0) { throw 'ADB installation failed.' }

Write-Host 'Launching com.masumon.offlinememory' -ForegroundColor Gray
adb shell monkey -p com.masumon.offlinememory -c android.intent.category.LAUNCHER 1
if ($LASTEXITCODE -ne 0) { throw 'Android launch failed.' }

Write-Host '`nLOCAL VERIFICATION PASSED' -ForegroundColor Green
