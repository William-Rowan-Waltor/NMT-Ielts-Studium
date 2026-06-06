[CmdletBinding()]
param(
    [string]$BaseModel = "qwen2.5:7b",
    [string]$ModelName = "ielts-fighter",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot ".local\ollama"
$downloadRoot = Join-Path $projectRoot ".local\downloads"
$binRoot = Join-Path $localRoot "bin"
$modelRoot = Join-Path $localRoot "models"
$archivePath = Join-Path $downloadRoot "ollama-windows-amd64.zip"
$partialPath = "$archivePath.partial"
$templatePath = Join-Path $projectRoot "local-ai\Modelfile.template"
$generatedPath = Join-Path $localRoot "Modelfile.generated"
$downloadUrl = "https://ollama.com/download/ollama-windows-amd64.zip"

function Get-LocalOllamaExe {
    $exe = Get-ChildItem -LiteralPath $binRoot -Filter "ollama.exe" -File -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($exe) {
        return $exe.FullName
    }
    return $null
}

function Test-OllamaApiPort {
    param([int]$Port)
    try {
        $null = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/version" -Method Get -TimeoutSec 2
        return $true
    } catch {
        return $false
    }
}

Write-Host "Project root: $projectRoot"
Write-Host "Runtime:      $binRoot"
Write-Host "Model store:  $modelRoot"
Write-Host "Base model:   $BaseModel"
Write-Host "App alias:    $ModelName"

if ($DryRun) {
    Write-Host "Dry run complete. No files were downloaded and no process was started."
    exit 0
}

if (-not (Test-Path -LiteralPath $templatePath)) {
    throw "Missing local-ai\Modelfile.template."
}

New-Item -ItemType Directory -Force -Path $downloadRoot, $binRoot, $modelRoot | Out-Null
$ollamaExe = Get-LocalOllamaExe

if (-not $ollamaExe) {
    $installedOllama = Get-Command "ollama.exe" -ErrorAction SilentlyContinue
    $installedRoot = if ($installedOllama) { Split-Path -Parent $installedOllama.Source } else { $null }
    $installedLib = if ($installedRoot) { Join-Path $installedRoot "lib" } else { $null }

    if ($installedOllama -and (Test-Path -LiteralPath $installedLib)) {
        Write-Host "Copying the existing system Ollama runtime into the project..."
        Copy-Item -LiteralPath $installedOllama.Source -Destination (Join-Path $binRoot "ollama.exe") -Force
        Copy-Item -LiteralPath $installedLib -Destination $binRoot -Recurse -Force
        $ollamaExe = Get-LocalOllamaExe
    } else {
        Write-Host "Downloading official Ollama standalone runtime (about 1.4 GB)..."
        Remove-Item -LiteralPath $partialPath -Force -ErrorAction SilentlyContinue

        $curl = Get-Command "curl.exe" -ErrorAction SilentlyContinue
        if ($curl) {
            & $curl.Source -L --fail --progress-bar $downloadUrl -o $partialPath
            if ($LASTEXITCODE -ne 0) {
                throw "Ollama download failed with curl exit code $LASTEXITCODE."
            }
        } else {
            Invoke-WebRequest -Uri $downloadUrl -OutFile $partialPath -UseBasicParsing
        }

        Move-Item -LiteralPath $partialPath -Destination $archivePath -Force
        Write-Host "Extracting project-local Ollama runtime..."
        Expand-Archive -LiteralPath $archivePath -DestinationPath $binRoot -Force
        Remove-Item -LiteralPath $archivePath -Force

        $ollamaExe = Get-LocalOllamaExe
        if (-not $ollamaExe) {
            throw "The downloaded archive did not contain ollama.exe."
        }
    }
} else {
    Write-Host "Project-local Ollama runtime already exists."
}

$setupPort = 11434
$temporaryPort = $false
try {
    & (Join-Path $PSScriptRoot "start-local-ai.ps1") -Port $setupPort
} catch {
    if (-not (Test-OllamaApiPort -Port 11434)) {
        throw
    }
    $setupPort = 11534
    $temporaryPort = $true
    Write-Host "Another Ollama owns port 11434. Using temporary setup port $setupPort without stopping it."
    & (Join-Path $PSScriptRoot "start-local-ai.ps1") -Port $setupPort
}

$env:OLLAMA_HOST = "127.0.0.1:$setupPort"
$env:OLLAMA_MODELS = $modelRoot
$env:OLLAMA_NO_CLOUD = "1"

try {
    Write-Host "Downloading base model '$BaseModel'. This can take several GB..."
    & $ollamaExe pull $BaseModel
    if ($LASTEXITCODE -ne 0) {
        throw "ollama pull failed with exit code $LASTEXITCODE."
    }

    $template = Get-Content -LiteralPath $templatePath -Raw
    if (-not $template.Contains("__BASE_MODEL__")) {
        throw "local-ai\Modelfile.template does not contain the __BASE_MODEL__ placeholder."
    }
    $generated = $template.Replace("__BASE_MODEL__", $BaseModel)
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($generatedPath, $generated, $utf8NoBom)

    Write-Host "Creating app model alias '$ModelName'..."
    & $ollamaExe create $ModelName -f $generatedPath
    if ($LASTEXITCODE -ne 0) {
        throw "ollama create failed with exit code $LASTEXITCODE."
    }
} finally {
    if ($temporaryPort) {
        & (Join-Path $PSScriptRoot "stop-local-ai.ps1")
    }
}

Write-Host ""
Write-Host "Local AI setup is complete."
Write-Host "Writing grader and Local Ollama provider URL: http://localhost:11434/v1/chat/completions"
Write-Host "Model: $ModelName"
Write-Host "API key placeholder: ollama"
Write-Host "Run start-local-ai.bat after restarting Windows or moving the project."
if ($temporaryPort) {
    Write-Host "System Ollama still owns port 11434. Quit it before running start-local-ai.bat."
}
