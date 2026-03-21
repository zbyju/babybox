# Babybox Startup Script for Windows (PowerShell)
# Alternative to batch script

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$startupBin = "..\..\dist\startup-windows.exe"

if (Test-Path $startupBin) {
    & $startupBin --windows
} else {
    Write-Host "Binary not found, running from source..."
    Set-Location "..\..\"
    & bun src/presentation/cli.ts --windows
}
