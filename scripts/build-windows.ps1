param(
  [switch]$SmokeTest
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$desktopDir = Join-Path $repoRoot "apps\desktop"
$binDir = Join-Path $desktopDir "bin"
$distDir = Join-Path $desktopDir "dist"
$config = Join-Path $desktopDir "electron-builder.yml"

function Assert-WorkspacePath([string]$Path) {
  $resolved = [IO.Path]::GetFullPath($Path)
  $prefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  if (-not $resolved.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify a path outside the repository: $resolved"
  }
}

function Remove-BuildDirectory([string]$Path) {
  Assert-WorkspacePath $Path
  if (Test-Path -LiteralPath $Path) {
    try {
      Remove-Item -LiteralPath $Path -Recurse -Force
    } catch {
      throw "Cannot clean $Path. Close CoreShare Provider and coreshare-worker.exe, then retry. $($_.Exception.Message)"
    }
  }
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Get-PeSubsystem([string]$Path) {
  $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $reader = [IO.BinaryReader]::new($stream)
    $stream.Position = 0x3c
    $peOffset = $reader.ReadInt32()
    $stream.Position = $peOffset + 24 + 68
    return $reader.ReadUInt16()
  } finally {
    $stream.Dispose()
  }
}

function Test-GuiExecutable([string]$Path) {
  $knownIds = @(Get-Process -ErrorAction SilentlyContinue |
      Where-Object { $_.ProcessName -like "CoreShare*" } |
      ForEach-Object { $_.Id })
  $startedAt = Get-Date
  $bootstrap = Start-Process -FilePath $Path -PassThru
  $deadline = (Get-Date).AddSeconds(30)
  $windowProcess = $null

  do {
    Start-Sleep -Milliseconds 500
    $candidates = @(Get-Process -ErrorAction SilentlyContinue |
        Where-Object {
          $_.ProcessName -like "CoreShare*" -and
          $_.Id -notin $knownIds -and
          $_.StartTime -ge $startedAt.AddSeconds(-1)
        })
    $windowProcess = $candidates |
      Where-Object { $_.MainWindowHandle -ne 0 } |
      Select-Object -First 1
  } while (-not $windowProcess -and (Get-Date) -lt $deadline)

  if (-not $windowProcess) {
    $log = Join-Path $env:APPDATA "CoreShare Provider\logs\startup.log"
    $tail = if (Test-Path -LiteralPath $log) {
      (Get-Content -LiteralPath $log -Tail 30) -join "`n"
    } else {
      "No startup log was created."
    }
    throw "$Path did not create a visible window.`n$tail"
  }

  Write-Host "GUI smoke test passed for $(Split-Path $Path -Leaf) (window handle $($windowProcess.MainWindowHandle))."
  $null = $windowProcess.CloseMainWindow()
  Start-Sleep -Milliseconds 750
  Get-Process -ErrorAction SilentlyContinue |
    Where-Object {
      $_.ProcessName -like "CoreShare*" -and
      $_.Id -notin $knownIds -and
      $_.StartTime -ge $startedAt.AddSeconds(-1)
    } |
    Stop-Process -Force -ErrorAction SilentlyContinue
}

if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
  throw "This build script must run on Windows."
}
if (-not (Test-Path -LiteralPath $config -PathType Leaf)) {
  throw "Electron Builder config not found at $config."
}
if (-not (Test-Path -LiteralPath (Join-Path $desktopDir "node_modules\electron-builder\cli.js"))) {
  Write-Host "Installing locked desktop dependencies..."
  & npm ci --prefix $desktopDir
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE." }
}

Write-Host "Cleaning previous Windows artifacts..."
Remove-BuildDirectory $binDir
Remove-BuildDirectory $distDir

& (Join-Path $PSScriptRoot "build-worker.ps1") -OutputDirectory $binDir

Write-Host "Packaging Electron application..."
Push-Location $desktopDir
try {
  & node "node_modules\electron-builder\cli.js" --config $config --win --x64
  if ($LASTEXITCODE -ne 0) { throw "electron-builder failed with exit code $LASTEXITCODE." }
} finally {
  Pop-Location
}

$launcher = Join-Path $distDir "win-unpacked\CoreShareProvider.exe"
$bundledWorker = Join-Path $distDir "win-unpacked\resources\worker\coreshare-worker.exe"
$installer = Get-ChildItem -LiteralPath $distDir -Filter "*-Setup.exe" -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
$portable = Get-ChildItem -LiteralPath $distDir -Filter "*-Portable.exe" -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $installer) { throw "The Windows installer was not created." }
if (-not $portable) { throw "The portable Windows executable was not created." }
foreach ($binary in @($launcher, $bundledWorker, $installer.FullName, $portable.FullName)) {
  if (-not (Test-Path -LiteralPath $binary -PathType Leaf)) {
    throw "Required Windows artifact is missing: $binary"
  }
  $subsystem = Get-PeSubsystem $binary
  if ($subsystem -ne 2) {
    throw "$binary is not a Windows GUI executable (PE subsystem=$subsystem)."
  }
}

if ($SmokeTest) {
  Write-Host "Starting unpacked GUI smoke test..."
  Test-GuiExecutable $launcher
  Write-Host "Starting portable GUI smoke test..."
  Test-GuiExecutable $portable.FullName
}

Write-Host ""
Write-Host "Windows build complete:"
Write-Host "  Installer: $($installer.FullName)"
Write-Host "  Portable:  $($portable.FullName)"
Write-Host "  App:       $launcher"
Write-Host "  Worker:    $bundledWorker"
