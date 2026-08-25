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

Write-Host '`n[5/5] Android device' -ForegroundColor Yellow
$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  Write-Host 'ADB is not installed or is not on PATH. Code verification passed; Android device verification was skipped.' -ForegroundColor DarkYellow
  exit 0
}

$devices = @(adb devices | Select-String '\sdevice$')
if ($devices.Count -eq 0) {
  Write-Host 'No online Android device/emulator detected. Code verification passed; Android runtime verification was skipped.' -ForegroundColor DarkYellow
  exit 0
}

$apk = Join-Path $PSScriptRoot '..\android\app\build\outputs\apk\debug\app-debug.apk'
$apk = [System.IO.Path]::GetFullPath($apk)
if (-not (Test-Path $apk)) {
  Write-Host 'No debug APK found. Build it with: npx expo run:android --variant debug --no-build-cache' -ForegroundColor DarkYellow
  exit 0
}

Write-Host "Installing $apk" -ForegroundColor Gray
adb install -r $apk
if ($LASTEXITCODE -ne 0) { throw 'ADB installation failed.' }

Write-Host 'Launching com.masumon.offlinememory' -ForegroundColor Gray
adb shell monkey -p com.masumon.offlinememory -c android.intent.category.LAUNCHER 1
if ($LASTEXITCODE -ne 0) { throw 'Android launch failed.' }

Write-Host '`nLOCAL VERIFICATION PASSED' -ForegroundColor Green
