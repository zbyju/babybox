# Behavioral tests for scripts/windows/startup.bat.
# Run on Windows: pwsh -NoProfile -File apps/startup/tests/startup.windows.test.ps1
# Each case gets its own USERPROFILE. Nothing is installed on the machine.
$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$Passed = 0
$Failed = 0
$StartupSrc = Split-Path -Parent $PSScriptRoot
$BatSrc = Join-Path $StartupSrc "scripts\windows\startup.bat"
$VersionsSrc = Join-Path $StartupSrc "versions.env"
$script:BunVersion = ""
foreach ($versionLine in Get-Content -Path $VersionsSrc) {
  if ($versionLine -like "BUN_VERSION=*") {
    $script:BunVersion = ($versionLine -split "=", 2)[1].Trim()
  }
}
if ($script:BunVersion -eq "") { throw "BUN_VERSION is missing from versions.env" }
$Sandbox = $null
$CallsText = ""
$LogText = ""
$Stdout = ""
$Stderr = ""
$RC = 0
$Log = ""
$Calls = ""
$InstalledBun = ""

function Pass { $script:Passed++ }

function Fail([string]$Why) {
  $script:Failed++
  Write-Host "  FAIL: $Why"
  if ($script:LogText) {
    Write-Host "  log:"
    $script:LogText -split "`n" | ForEach-Object { Write-Host "    $_" }
  }
  if ($script:CallsText) {
    Write-Host "  calls:"
    $script:CallsText -split "`n" | ForEach-Object { Write-Host "    $_" }
  }
  if ($script:Stdout) { Write-Host "  stdout: $($script:Stdout)" }
  if ($script:Stderr) { Write-Host "  stderr: $($script:Stderr)" }
}

function Expect-Called([string]$Text) {
  if ($script:CallsText.Contains($Text)) { Pass } else { Fail "missing call: $Text" }
}

function Expect-NotCalled([string]$Text) {
  if ($script:CallsText.Contains($Text)) { Fail "unexpected call: $Text" } else { Pass }
}

function Expect-Log([string]$Text) {
  if ($script:LogText.Contains($Text)) { Pass } else { Fail "missing log: $Text" }
}

function Expect-NoLog([string]$Text) {
  if ($script:LogText.Contains($Text)) { Fail "unexpected log: $Text" } else { Pass }
}

function Expect-Rc([int]$Want) {
  if ($script:RC -eq $Want) { Pass } else { Fail "exit $($script:RC), want $Want" }
}

function Expect-PnpmDir {
  $got = ""
  foreach ($row in ($script:CallsText -split '\r?\n')) {
    if ($row.StartsWith("PNPM_DIR=")) {
      $got = $row.Substring(9).Trim()
      break
    }
  }
  if ($got -eq "") { Fail "missing pnpm directory"; return }
  $want = [IO.Path]::GetFullPath($script:AppDir).TrimEnd('\')
  $full = [IO.Path]::GetFullPath($got).TrimEnd('\')
  if ([string]::Equals($full, $want, [StringComparison]::OrdinalIgnoreCase)) {
    Pass
  } else {
    Fail "pnpm dir $full, want $want"
  }
}

function Write-Cmd([string]$Path, [string]$Body) {
  $text = ($Body -replace "`r`n", "`n") -replace "`n", "`r`n"
  if (-not $text.EndsWith("`r`n")) { $text += "`r`n" }
  [IO.File]::WriteAllText($Path, $text)
}

function Reset-Case {
  $script:StubPm2 = "7.0.4"
  $script:StubBunMissing = $false
  $script:StubBunPrint = $script:BunVersion
  $script:StubBunExit = "0"
  $script:HoldVersion = ""
  $script:NpmInstallExit = "0"
  $script:Pm2UpdateExit = "0"
  $script:CurlFail = "0"
  $script:DropKey = ""
  $script:RewriteSha = $false
  $script:SeedDeps = "startup/pino backend/express configer/express panel/vue"
  $script:OsRelease = "10.0.17763"
  $script:UseRealVer = $false
}

function New-BunStub([string]$Dest) {
  $csc = @(
    "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $csc) { throw "csc.exe is missing" }
  $cs = Join-Path (Split-Path -Parent $Dest) "bun-stub.cs"
  @'
using System;
using System.IO;
public class BunStub {
  public static int Main(string[] args) {
    string calls = Environment.GetEnvironmentVariable("CALLS");
    if (!string.IsNullOrEmpty(calls)) {
      File.AppendAllText(calls, "bun " + string.Join(" ", args) + "\r\n");
    }
    string printed = Environment.GetEnvironmentVariable("STUB_BUN_PRINT");
    if (printed == null) printed = "";
    if (args.Length > 0 && args[0] == "-v" && printed.Length > 0) {
      Console.WriteLine(printed);
    }
    string code = Environment.GetEnvironmentVariable("STUB_BUN_EXIT");
    if (code == "-1073741795" || code == "3221225501") return -1073741795;
    int n = 0;
    if (!string.IsNullOrEmpty(code)) int.TryParse(code, out n);
    return n;
  }
}
'@ | Set-Content -Encoding ASCII -Path $cs
  & $csc /nologo /t:exe "/out:$Dest" $cs
  if ($LASTEXITCODE -ne 0) { throw "csc failed" }
}

function Add-Trailer([string]$Src, [string]$Dest, [string]$Trailer) {
  $bytes = [IO.File]::ReadAllBytes($Src)
  $extra = [Text.Encoding]::ASCII.GetBytes($Trailer)
  $all = New-Object byte[] ($bytes.Length + $extra.Length)
  [Array]::Copy($bytes, $all, $bytes.Length)
  [Array]::Copy($extra, 0, $all, $bytes.Length, $extra.Length)
  [IO.File]::WriteAllBytes($Dest, $all)
}

function New-FixtureZip([string]$StubExe, [string]$ZipPath) {
  Add-Type -AssemblyName System.IO.Compression | Out-Null
  Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
  $src = Join-Path (Split-Path -Parent $ZipPath) "zip-src\bun-windows-x64"
  New-Item -ItemType Directory -Force -Path $src | Out-Null
  Copy-Item $StubExe (Join-Path $src "bun.exe") -Force
  if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
  [IO.Compression.ZipFile]::CreateFromDirectory((Split-Path -Parent $src), $ZipPath)
}

function Invoke-Case {
  if ($script:Sandbox -and (Test-Path $script:Sandbox)) {
    Remove-Item -Recurse -Force $script:Sandbox
  }
  $script:Sandbox = Join-Path ([IO.Path]::GetTempPath()) ("babybox-win-" + [guid]::NewGuid().ToString("N"))
  $home = Join-Path $script:Sandbox "home"
  $startup = Join-Path $home "babybox\source\apps\startup"
  $script:AppDir = $startup
  $stubDir = Join-Path $script:Sandbox "stub"
  $state = Join-Path $script:Sandbox "state"
  $temp = Join-Path $script:Sandbox "temp"
  $script:Calls = Join-Path $script:Sandbox "calls.txt"
  $script:Log = Join-Path $home "babybox\source\logs\startup.bat.log"
  $script:InstalledBun = Join-Path $home ".bun\bin\bun.exe"
  New-Item -ItemType Directory -Force -Path $stubDir, $state, $temp, (Join-Path $startup "scripts\windows") | Out-Null
  [IO.File]::WriteAllText($script:Calls, "")

  $versions = Join-Path $startup "versions.env"
  $lines = Get-Content -Path $VersionsSrc
  if ($script:DropKey) {
    $lines = $lines | Where-Object { $_ -notlike ($script:DropKey + "=*") }
  }
  if ($script:RewriteSha) {
    $lines = $lines | ForEach-Object {
      if ($_ -like "BUN_WINDOWS_X64_SHA256=*") { "BUN_WINDOWS_X64_SHA256=$script:ZipSha" } else { $_ }
    }
  }
  [IO.File]::WriteAllLines($versions, $lines)

  Copy-Item $BatSrc (Join-Path $startup "scripts\windows\startup.bat") -Force

  Write-Cmd (Join-Path $stubDir "curl.cmd") @'
@echo off
setlocal EnableDelayedExpansion
>>"%CALLS%" echo curl %*
if "%CURL_FAIL%"=="1" exit /b 1
set "PREV="
set "OUT="
:argloop
if "%~1"=="" goto argdone
if /i "!PREV!"=="-o" set "OUT=%~1"
set "PREV=%~1"
shift
goto argloop
:argdone
if not defined OUT exit /b 1
copy /y "%BUN_ZIP%" "!OUT!" >nul
exit /b 0
'@
  Write-Cmd (Join-Path $stubDir "npm.cmd") @'
@echo off
setlocal EnableDelayedExpansion
>>"%CALLS%" echo npm %*
if /i not "%~1"=="install" exit /b 0
if /i not "%~2"=="-g" exit /b 0
if "%NPM_INSTALL_EXIT%"=="1" exit /b 1
set "SPEC=%~3"
if /i not "!SPEC:~0,4!"=="pm2@" (
  >>"%CALLS%" echo unexpected !SPEC!
  exit /b 1
)
set "VER=!SPEC:pm2@=!"
>"%STATE%\pm2_version" <nul set /p "=!VER!"
exit /b 0
'@
  Write-Cmd (Join-Path $stubDir "pm2.cmd") @'
@echo off
setlocal EnableDelayedExpansion
>>"%CALLS%" echo pm2 %*
if /i "%~1"=="--version" (
  if not exist "%STATE%\pm2_version" exit /b 1
  set /p V=<"%STATE%\pm2_version"
  echo !V!
  exit /b 0
)
if /i "%~1"=="update" (
  if "%PM2_UPDATE_EXIT%"=="1" exit /b 1
)
exit /b 0
'@
  Write-Cmd (Join-Path $stubDir "pnpm.cmd") @'
@echo off
>>"%CALLS%" echo pnpm %*
>>"%CALLS%" echo PATH=%PATH%
>>"%CALLS%" echo PNPM_DIR=%CD%
exit /b 0
'@
  Write-Cmd (Join-Path $stubDir "nvm.cmd") @'
@echo off
>>"%CALLS%" echo nvm %*
exit /b 1
'@
  Write-Cmd (Join-Path $stubDir "git.cmd") @'
@echo off
>>"%CALLS%" echo git %*
exit /b 1
'@
  Write-Cmd (Join-Path $stubDir "bun.cmd") @'
@echo off
>>"%CALLS%" echo bare-bun %*
exit /b 99
'@

  [IO.File]::WriteAllText((Join-Path $state "pm2_version"), $script:StubPm2)
  if (-not $script:StubBunMissing) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $script:InstalledBun) | Out-Null
    Copy-Item $script:OldExe $script:InstalledBun -Force
  }
  if ($script:HoldVersion) {
    $holdDir = Join-Path $home ".bun"
    New-Item -ItemType Directory -Force -Path $holdDir | Out-Null
    [IO.File]::WriteAllText((Join-Path $holdDir "cpu-hold"), $script:HoldVersion)
  }
  foreach ($probe in ($script:SeedDeps -split " ")) {
    if (-not $probe) { continue }
    $pair = $probe -split "/"
    $dir = Join-Path $home ("babybox\source\apps\" + $pair[0] + "\node_modules\" + $pair[1])
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $bat = Join-Path $startup "scripts\windows\startup.bat"
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = Join-Path $env:SystemRoot "System32\cmd.exe"
  $psi.Arguments = "/d /c `"$bat`""
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.WorkingDirectory = $env:SystemRoot
  $psi.EnvironmentVariables["PATH"] = "$stubDir;$env:SystemRoot\System32"
  $psi.EnvironmentVariables["USERPROFILE"] = $home
  $psi.EnvironmentVariables["TEMP"] = $temp
  $psi.EnvironmentVariables["TMP"] = $temp
  $psi.EnvironmentVariables["CALLS"] = $script:Calls
  $psi.EnvironmentVariables["STATE"] = $state
  $psi.EnvironmentVariables["BUN_ZIP"] = $script:ZipPath
  $psi.EnvironmentVariables["CURL_FAIL"] = $script:CurlFail
  $psi.EnvironmentVariables["NPM_INSTALL_EXIT"] = $script:NpmInstallExit
  $psi.EnvironmentVariables["PM2_UPDATE_EXIT"] = $script:Pm2UpdateExit
  $psi.EnvironmentVariables["STUB_BUN_PRINT"] = $script:StubBunPrint
  $psi.EnvironmentVariables["STUB_BUN_EXIT"] = $script:StubBunExit
  if ($script:UseRealVer) {
    if ($psi.EnvironmentVariables.ContainsKey("BABYBOX_OS_RELEASE")) {
      [void]$psi.EnvironmentVariables.Remove("BABYBOX_OS_RELEASE")
    }
  } else {
    $psi.EnvironmentVariables["BABYBOX_OS_RELEASE"] = $script:OsRelease
  }

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  [void]$proc.Start()
  $outTask = $proc.StandardOutput.ReadToEndAsync()
  $errTask = $proc.StandardError.ReadToEndAsync()
  if (-not $proc.WaitForExit(20000)) {
    try { $proc.Kill() } catch {}
    $script:RC = 124
    $script:Stdout = "timeout"
    $script:Stderr = ""
  } else {
    $proc.WaitForExit() | Out-Null
    $script:RC = $proc.ExitCode
    $script:Stdout = $outTask.Result
    $script:Stderr = $errTask.Result
  }
  $script:CallsText = [IO.File]::ReadAllText($script:Calls)
  if (Test-Path $script:Log) {
    $script:LogText = [IO.File]::ReadAllText($script:Log)
  } else {
    $script:LogText = ""
  }
}

Write-Host "compile bun stub"
$work = Join-Path ([IO.Path]::GetTempPath()) ("babybox-winstub-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $work | Out-Null
$script:StubExe = Join-Path $work "bun-stub.exe"
$script:OldExe = Join-Path $work "old-bun.exe"
$script:ZipExe = Join-Path $work "zip-bun.exe"
$script:ZipPath = Join-Path $work "bun-windows-x64.zip"
New-BunStub $script:StubExe
Add-Trailer $script:StubExe $script:OldExe "OLD-BUN"
Add-Trailer $script:StubExe $script:ZipExe "NEW-BUN"
New-FixtureZip $script:ZipExe $script:ZipPath
$script:ZipSha = (Get-FileHash -Algorithm SHA256 -Path $script:ZipPath).Hash
Write-Host "zip sha $script:ZipSha"

Write-Host "cmd exit code for an illegal instruction"
$helper = Join-Path $work "exitcode.cmd"
Write-Cmd $helper @'
@echo off
"%~1" -v
echo EXIT:%ERRORLEVEL%
'@
$env:STUB_BUN_EXIT = "-1073741795"
$env:STUB_BUN_PRINT = ""
$env:CALLS = Join-Path $work "self-calls.txt"
[IO.File]::WriteAllText($env:CALLS, "")
$codeLine = & cmd.exe /d /c "`"$helper`" `"$script:StubExe`""
Write-Host "  $codeLine"
$observed = ""
foreach ($line in @($codeLine)) {
  if ($line -like "EXIT:*") { $observed = $line.Substring(5).Trim() }
}
if ($observed -ne "-1073741795" -and $observed -ne "3221225501") {
  Fail "cmd reports illegal exit as '$observed'"
} else {
  Pass
}

Write-Host "matching bun does not download"
Reset-Case
Invoke-Case
Expect-NotCalled "bun-windows-x64.zip"
Expect-NotCalled "npm install -g"
Expect-NotCalled "bare-bun"
Expect-NotCalled "nvm "
Expect-NotCalled "git "
Expect-Called "pnpm run start"
Expect-PnpmDir
Expect-NotCalled "--ubuntu"
Expect-Called ".bun\bin"
Expect-Called "bun -v"
Expect-NoLog "Zavislosti chybi"
Expect-Rc 0

Write-Host "missing bun and a matching checksum lands in the user profile"
Reset-Case
$script:StubBunMissing = $true
$script:RewriteSha = $true
Invoke-Case
Expect-Called "https://github.com/oven-sh/bun/releases/download/bun-v$($script:BunVersion)/bun-windows-x64.zip"
Expect-Called "babybox-bootstrap"
Expect-NotCalled "baseline"
Expect-NotCalled "bare-bun"
Expect-NotCalled "nvm "
Expect-Log "Bun $($script:BunVersion) je nainstalovany"
Expect-Called "pnpm run start"
Expect-Rc 0
if (Test-Path $script:InstalledBun) {
  $got = (Get-FileHash -Algorithm SHA256 -Path $script:InstalledBun).Hash
  $want = (Get-FileHash -Algorithm SHA256 -Path $script:ZipExe).Hash
  if ($got -eq $want) { Pass } else { Fail "installed bun hash differs" }
} else {
  Fail "bun.exe was not written"
}

Write-Host "a v prefix does not download"
Reset-Case
$script:StubBunPrint = "v$($script:BunVersion)"
Invoke-Case
Expect-NotCalled "bun-windows-x64.zip"
Expect-Rc 0

Write-Host "a bad checksum keeps the old bun and the panel still starts"
Reset-Case
$script:StubBunPrint = "0.0.1"
Invoke-Case
Expect-Called "bun-windows-x64.zip"
Expect-Log "Kontrolni soucet archivu Bun se neshoduje"
Expect-Called "pnpm run start"
Expect-Rc 0
$wantOld = (Get-FileHash -Algorithm SHA256 -Path $script:OldExe).Hash
$gotOld = (Get-FileHash -Algorithm SHA256 -Path $script:InstalledBun).Hash
if ($wantOld -eq $gotOld) { Pass } else { Fail "bad checksum replaced bun.exe" }

Write-Host "a failed download still starts the panel"
Reset-Case
$script:StubBunMissing = $true
$script:CurlFail = "1"
Invoke-Case
Expect-Log "Stazeni Bun se nezdarilo"
Expect-Called "pnpm run start"
Expect-Rc 0

Write-Host "the same cpu-hold does not download"
Reset-Case
$script:StubBunMissing = $true
$script:HoldVersion = $script:BunVersion
Invoke-Case
Expect-NotCalled "bun-windows-x64.zip"
Expect-Log "CPU_HOLD"
Expect-Called "pnpm run start"
Expect-Rc 0

Write-Host "an illegal instruction and the same hold do not download"
Reset-Case
$script:StubBunExit = "-1073741795"
$script:HoldVersion = $script:BunVersion
Invoke-Case
Expect-NotCalled "bun-windows-x64.zip"
Expect-Log "CPU_HOLD"
Expect-Rc 0

Write-Host "exit 132 and the same hold do not download"
Reset-Case
$script:StubBunExit = "132"
$script:HoldVersion = $script:BunVersion
Invoke-Case
Expect-NotCalled "bun-windows-x64.zip"
Expect-Log "CPU_HOLD"
Expect-Rc 0

Write-Host "an illegal instruction and a different hold downloads"
Reset-Case
$script:StubBunExit = "-1073741795"
$script:HoldVersion = "1.0.0"
$script:CurlFail = "1"
Invoke-Case
Expect-Called "bun-windows-x64.zip"
Expect-Log "Stazeni Bun se nezdarilo"
Expect-Rc 0

Write-Host "a matching bun deletes cpu-hold"
Reset-Case
$script:HoldVersion = "1.0.0"
Invoke-Case
$hold = Join-Path (Split-Path -Parent (Split-Path -Parent $script:InstalledBun)) "cpu-hold"
if (-not (Test-Path $hold)) { Pass } else { Fail "cpu-hold remained" }

Write-Host "a different pm2 installs the pinned version"
Reset-Case
$script:StubPm2 = "5.2.0"
Invoke-Case
Expect-Called "npm install -g pm2@7.0.4"
Expect-Called "pm2 update"
Expect-NotCalled "pnpm@"
Expect-Rc 0

Write-Host "a failed pm2 install still starts the panel"
Reset-Case
$script:StubPm2 = "5.2.0"
$script:NpmInstallExit = "1"
Invoke-Case
Expect-Log "pm2 se nepodarilo nainstalovat"
Expect-NotCalled "pm2 update"
Expect-Called "pnpm run start"
Expect-Rc 0

Write-Host "a failed pm2 update still starts the panel"
Reset-Case
$script:StubPm2 = "5.2.0"
$script:Pm2UpdateExit = "1"
Invoke-Case
Expect-Log "pm2 update selhal"
Expect-Called "pnpm run start"
Expect-Rc 0

Write-Host "versions.env without PM2_VERSION skips install and still starts"
Reset-Case
$script:DropKey = "PM2_VERSION"
$script:StubPm2 = "5.2.0"
Invoke-Case
Expect-Log "PM2_VERSION chybi ve versions.env"
Expect-Log "kontrolu verzi preskakuji"
Expect-NotCalled "npm install -g"
Expect-NotCalled "bun-windows-x64.zip"
Expect-Called "pnpm run start"
Expect-Rc 0

Write-Host "missing pino is logged and the panel still starts"
Reset-Case
$script:SeedDeps = "startup/winston backend/express configer/express panel/vue"
Invoke-Case
Expect-Log "Zavislosti chybi"
Expect-Called "pnpm run start"
Expect-Rc 0

Write-Host "git pull does not run"
Reset-Case
Invoke-Case
Expect-NotCalled "git "

$gates = @(
  @("6.1.7601", $false),
  @("6.2.9200", $false),
  @("6.3.9600", $false),
  @("10.0.10240", $false),
  @("10.0.17762", $false),
  @("10.0.17763", $true),
  @("10.0.19045", $true),
  @("10.0.22000", $true)
)
foreach ($gate in $gates) {
  $release = $gate[0]
  $should = [bool]$gate[1]
  Write-Host "release $release downloads=$should"
  Reset-Case
  $script:OsRelease = $release
  $script:StubBunMissing = $true
  $script:CurlFail = "1"
  Invoke-Case
  Expect-Called "pnpm run start"
  Expect-Rc 0
  if ($should) {
    Expect-Called "bun-windows-x64.zip"
    Expect-Log "Stazeni Bun se nezdarilo"
    Expect-NoLog "nespusti Bun"
  } else {
    Expect-NotCalled "bun-windows-x64.zip"
    Expect-Log "nespusti Bun"
  }
}

Write-Host "the real ver command on this runner parses a release"
Reset-Case
$script:UseRealVer = $true
$script:StubBunMissing = $true
$script:CurlFail = "1"
Invoke-Case
Expect-Called "bun-windows-x64.zip"
Expect-NoLog "nespusti Bun"
Expect-Rc 0

if ($script:Sandbox -and (Test-Path $script:Sandbox)) {
  Remove-Item -Recurse -Force $script:Sandbox
}
if (Test-Path $work) {
  Remove-Item -Recurse -Force $work
}

Write-Host ""
Write-Host "passed: $Passed, failed: $Failed"
if ($Failed -ne 0) { exit 1 }
exit 0
