@echo off
REM Babybox Startup Script for Windows
REM Place shortcut in shell:startup folder

cd /d "%~dp0"

set STARTUP_BIN=..\..\dist\startup-windows.exe

if exist "%STARTUP_BIN%" (
    "%STARTUP_BIN%" --windows
) else (
    echo Binary not found, running from source...
    cd ..\..
    bun src/presentation/cli.ts --windows
)
