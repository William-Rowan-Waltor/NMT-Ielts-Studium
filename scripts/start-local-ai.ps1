[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 11434
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot ".local\ollama"
$binRoot = Join-Path $localRoot "bin"
$modelRoot = Join-Path $localRoot "models"
$logRoot = Join-Path $localRoot "logs"
$pidFile = Join-Path $localRoot "ollama.pid"
$apiBase = "http://127.0.0.1:$Port"

function Get-LocalOllamaExe {
    $exe = Get-ChildItem -LiteralPath $binRoot -Filter "ollama.exe" -File -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $exe) {
        throw "Project-local Ollama was not found. Run setup-local-ai.bat first."
    }
    return $exe.FullName
}

function Test-OllamaApi {
    try {
        $null = Invoke-RestMethod -Uri "$apiBase/api/version" -Method Get -TimeoutSec 2
        return $true
    } catch {
        return $false
    }
}

function Get-SavedProjectProcess {
    if (-not (Test-Path -LiteralPath $pidFile)) {
        return $null
    }

    $savedPid = 0
    if (-not [int]::TryParse((Get-Content -LiteralPath $pidFile -Raw).Trim(), [ref]$savedPid)) {
        return $null
    }

    $process = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
    if (-not $process) {
        return $null
    }

    try {
        $processPath = [System.IO.Path]::GetFullPath($process.Path)
        $expectedRoot = [System.IO.Path]::GetFullPath($binRoot)
        if ($processPath.StartsWith($expectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $process
        }
    } catch {
        return $null
    }
    return $null
}

$ollamaExe = Get-LocalOllamaExe
New-Item -ItemType Directory -Force -Path $modelRoot, $logRoot | Out-Null

if (Test-OllamaApi) {
    $projectProcess = Get-SavedProjectProcess
    if ($projectProcess) {
        Write-Host "Project-local Ollama is already running at $apiBase (PID $($projectProcess.Id))."
        exit 0
    }
    throw "Port $Port is already used by another Ollama/service. Quit that process or choose another port."
}

$env:OLLAMA_HOST = "127.0.0.1:$Port"
$env:OLLAMA_MODELS = $modelRoot
$env:OLLAMA_ORIGINS = "*"
$env:OLLAMA_NO_CLOUD = "1"

$stdoutLog = Join-Path $logRoot "ollama.out.log"
$stderrLog = Join-Path $logRoot "ollama.err.log"
$process = Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WorkingDirectory $projectRoot `
    -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
[System.IO.File]::WriteAllText($pidFile, [string]$process.Id)

$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    if (Test-OllamaApi) {
        Write-Host "Project-local Ollama started at $apiBase (PID $($process.Id))."
        exit 0
    }
    if ($process.HasExited) {
        break
    }
    Start-Sleep -Milliseconds 750
}

if (-not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}
Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
throw "Project-local Ollama did not start. Check .local\ollama\logs\ollama.err.log."
