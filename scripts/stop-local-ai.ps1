[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot ".local\ollama"
$binRoot = Join-Path $localRoot "bin"
$pidFile = Join-Path $localRoot "ollama.pid"

if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Host "No project-local Ollama PID file was found. Nothing to stop."
    exit 0
}

$savedPid = 0
if (-not [int]::TryParse((Get-Content -LiteralPath $pidFile -Raw).Trim(), [ref]$savedPid)) {
    throw "The project-local Ollama PID file is invalid. Delete .local\ollama\ollama.pid after verifying no local Ollama process is running."
}

$process = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
if (-not $process) {
    Remove-Item -LiteralPath $pidFile -Force
    Write-Host "The saved project-local Ollama process is no longer running."
    exit 0
}

try {
    $processPath = [System.IO.Path]::GetFullPath($process.Path)
    $expectedRoot = [System.IO.Path]::GetFullPath($binRoot)
    if (-not $processPath.StartsWith($expectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "PID $savedPid is not the project-local Ollama process. It was not stopped."
    }
} catch {
    throw "Could not verify PID $savedPid as the project-local Ollama process. It was not stopped. $($_.Exception.Message)"
}

Stop-Process -Id $savedPid -Force
Remove-Item -LiteralPath $pidFile -Force
Write-Host "Project-local Ollama stopped."
