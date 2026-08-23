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

Invoke-Step 'Git tree' {
  git diff --quiet
  if ($LASTEXITCODE -ne 0) { throw 'Working tree has tracked changes. Commit or revert them before M8 verification.' }
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) { throw 'Index has staged changes. Commit or unstage them before M8 verification.' }
}

Invoke-Step 'Dependency sanity' {
  npm ls expo react react-native react-native-reanimated react-native-worklets jest jest-expo @react-native/jest-preset babel-preset-expo react-native-web --depth=0
}

Invoke-Step 'TypeScript' { npm exec -- tsc --noEmit }

Write-Host "`n=== Lint ===" -ForegroundColor Cyan
$lintOutput = & npm run lint 2>&1
$lintExit = $LASTEXITCODE
$lintOutput | ForEach-Object { Write-Host $_ }
if ($lintExit -ne 0) { throw "FAILED: Lint (exit code $lintExit)" }
$lintText = ($lintOutput -join "`n")
if ($lintText -match '(?i)\bwarning\b' -or $lintText -match '(?i)\bwarnings\b') {
  throw 'FAILED: Lint produced warnings. M8 requires a warning-free lint gate.'
}
Write-Host 'PASS: Lint' -ForegroundColor Green

Write-Host "`n=== Jest ===" -ForegroundColor Cyan
$jestOutput = & npm test -- --runInBand 2>&1
$jestExit = $LASTEXITCODE
$jestOutput | ForEach-Object { Write-Host $_ }
if ($jestExit -ne 0) { throw "FAILED: Jest (exit code $jestExit)" }
$jestText = ($jestOutput -join "`n")
if ($jestText -match '(?i)validation warning|unknown option|cannot log after tests are done') {
  throw 'FAILED: Jest produced configuration/runtime warnings. M8 requires a clean Jest gate.'
}
if ($jestText -notmatch 'Test Suites: 104 passed, 104 total' -or $jestText -notmatch 'Tests:\s+268 passed, 268 total') {
  throw 'FAILED: Jest did not report the expected 104/104 suites and 268/268 tests passing.'
}
Write-Host 'PASS: Jest' -ForegroundColor Green

Invoke-Step 'Expo Doctor' { npx expo-doctor }

Write-Host "`nAll static M8 checks passed." -ForegroundColor Green
Write-Host 'Android/device gates still require a real Android runtime.' -ForegroundColor Yellow
