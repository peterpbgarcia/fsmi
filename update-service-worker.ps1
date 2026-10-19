$ErrorActionPreference = 'Stop'

try {
if (-not (Test-Path ".\service-worker.js")) {
throw "service-worker.js not found."
}

$content = Get-Content ".\service-worker.js" -Raw

# ---------------------------------------------------------
# 1. INCREMENT CACHE VERSION
# ---------------------------------------------------------

$pattern = 'const\s+CACHE_NAME\s*=\s*["'']fsmi-app-v(\d+)\.(\d+)\.(\d+)["'']\s*;'
$match = [regex]::Match($content,$pattern)

if (-not $match.Success) {
    throw 'Could not find CACHE_NAME in the expected format: fsmi-app-v1.0.0'
}

$major = [int]$match.Groups[1].Value
$minor = [int]$match.Groups[2].Value
$patch = [int]$match.Groups[3].Value + 1

$version = "$major.$minor.$patch"
$newVersionLine = 'const CACHE_NAME = "fsmi-app-v' + $version + '";'

$content = [regex]::Replace(
    $content,$pattern,
    [System.Text.RegularExpressions.MatchEvaluator]{
        param($m)$newVersionLine
    },
    1
)

# ---------------------------------------------------------
# 2. SCAN PROJECT FILES (Relative Paths)
# ---------------------------------------------------------

$excludedFolders = @(
    '.git',
    'node_modules',
    'android',
    'ios',
    '.gradle',
    '.idea',
    '.vscode'
)

$excludedFiles = @(
    'service-worker.js',
    'update-service-worker.ps1',
    'update-service-worker.bat'
)

$basePath = (Get-Location).Path

$files = @(
    Get-ChildItem ".\." -Recurse -File |
    Where-Object {
        $relative = $_.FullName.Substring($basePath.Length).
            TrimStart([char[]]@('\', '/'))

        $parts =$relative -split '[\\/]'

        ($parts[0] -notin$excludedFolders) -and
        ($_.Name -notin$excludedFiles) -and
        ($_.Extension -notin @('.bat', '.ps1', '.bak'))
    } |
    ForEach-Object {
        $_.FullName.Substring($basePath.Length).
            TrimStart([char[]]@('\', '/')).Replace('\', '/')
    } |
    Sort-Object -Unique
)

if ($files.Count -eq 0) {
    throw 'No project files found.'
}

# ---------------------------------------------------------
# 3. REBUILD APP_FILES
# ---------------------------------------------------------

$entries = ($files | ForEach-Object {
    '    "' + $_ + '"'
}) -join ",`r`n"

$array = "const APP_FILES = [`r`n$entries`r`n];"

$arrayPattern = 'const\s+APP_FILES\s*=\s*\[[\s\S]*?\]\s*;'

if (-not [regex]::IsMatch($content,$arrayPattern)) {
    throw 'Could not find the APP_FILES array.'
}

$content = [regex]::Replace(
    $content,$arrayPattern,
    [System.Text.RegularExpressions.MatchEvaluator]{
        param($m)$array
    },
    1
)

# ---------------------------------------------------------
# 4. BACKUP AND WRITE
# ---------------------------------------------------------

Copy-Item ".\service-worker.js" ".\service-worker.js.bak" -Force

[System.IO.File]::WriteAllText(
    ".\service-worker.js",
    $content,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host ''
Write-Host '==========================================' -ForegroundColor Green
Write-Host '  FSMI UPDATE SUCCESSFUL' -ForegroundColor Green
Write-Host '==========================================' -ForegroundColor Green
Write-Host "New cache version: fsmi-app-v$version"
Write-Host "Files in APP_FILES: $($files.Count)"
Write-Host "Backup: service-worker.js.bak"
}
catch {
Write-Host ''
Write-Host 'ERROR: Update failed.' -ForegroundColor Red
Write-Host $.Exception.Message -ForegroundColor Red
Write-Host $.ScriptStackTrace -ForegroundColor Yellow
}

Write-Host ''
Read-Host 'Press ENTER to close'