# Bundle the worker into a standalone .exe (Windows). Run from anywhere.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$py = ".venv\Scripts\python.exe"
& $py -m PyInstaller --onefile --name coreshare-worker --paths . `
  --hidden-import=httpx `
  --distpath apps\desktop\bin --workpath build\pyi --specpath build\pyi `
  worker_entry.py
Write-Host "built -> apps\desktop\bin\coreshare-worker.exe"
