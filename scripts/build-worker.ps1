param(
  [string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$python = Join-Path $repoRoot ".venv\Scripts\python.exe"
$entryPoint = Join-Path $repoRoot "worker_entry.py"
$outputDir = if ($OutputDirectory) {
  [IO.Path]::GetFullPath($OutputDirectory)
} else {
  Join-Path $repoRoot "apps\desktop\bin"
}
$workDir = Join-Path $repoRoot "build\pyinstaller-windows"

if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
  throw "Python virtual environment not found at $python. Run .\setup.ps1 first."
}
if (-not (Test-Path -LiteralPath $entryPoint -PathType Leaf)) {
  throw "Worker entry point not found at $entryPoint."
}

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
foreach ($staleWorker in @(
  "corewhore-worker.exe",
  "coreshare-worker.exe",
  "corewhore-worker",
  "coreshare-worker"
)) {
  $stalePath = Join-Path $outputDir $staleWorker
  if (Test-Path -LiteralPath $stalePath) {
    Remove-Item -LiteralPath $stalePath -Recurse -Force
  }
}
if (Test-Path -LiteralPath $workDir) {
  Remove-Item -LiteralPath $workDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $workDir | Out-Null

$arguments = @(
  "-m", "PyInstaller",
  "--onedir",
  "--noconsole",
  "--noconfirm",
  "--clean",
  "--name", "coreshare-worker",
  "--paths", $repoRoot,
  "--hidden-import", "httpx",
  "--distpath", $outputDir,
  "--workpath", $workDir,
  "--specpath", $workDir,
  $entryPoint
)

Write-Host "Building hidden Windows worker..."
& $python @arguments
if ($LASTEXITCODE -ne 0) {
  throw "PyInstaller failed with exit code $LASTEXITCODE."
}

$worker = Join-Path $outputDir "coreshare-worker\coreshare-worker.exe"
if (-not (Test-Path -LiteralPath $worker -PathType Leaf)) {
  throw "PyInstaller finished without creating $worker."
}
Write-Host "Worker built: $worker"
