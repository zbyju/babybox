@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Starts the panel after login on Windows.
REM The Startup folder shortcut runs this file.
REM Do not move this file. Do not rename this file.
REM
REM This file does not run git pull. The Node startup app pulls, then builds.
REM A pull here makes that app see "Already up to date" and skip the build.
REM
REM This file does not use nvm.
REM This file does not install pnpm.
REM Bun is written to %USERPROFILE%\.bun\bin\bun.exe.
REM Later steps call that absolute path. They do not call bun from PATH.
REM A failed Bun or pm2 install does not stop the panel.
REM
REM The zip runs on Windows 10 build 17763 or newer, and on Windows 11.
REM The check reads the release numbers. It does not look for a product name.
REM BABYBOX_OS_RELEASE overrides those numbers. A box leaves it empty.
REM The value has the same shape as os.release().

set "STARTUP_DIR=%~dp0..\.."
pushd "%STARTUP_DIR%"
if errorlevel 1 exit /b 1
set "STARTUP_DIR=%CD%"
for %%I in ("%STARTUP_DIR%\..\..") do set "SOURCE_DIR=%%~fI"
set "LOG_FILE=%SOURCE_DIR%\logs\startup.bat.log"
set "VERSIONS=%STARTUP_DIR%\versions.env"
set "BUN_DIR=%USERPROFILE%\.bun\bin"
set "BUN_EXE=%BUN_DIR%\bun.exe"
set "HOLD_FILE=%USERPROFILE%\.bun\cpu-hold"
set "PATH=%BUN_DIR%;%PATH%"

call :main
set "RC=%ERRORLEVEL%"
popd
endlocal & exit /b %RC%

:main
call :log "Start"
if not exist "%VERSIONS%" goto :main_no_versions
call :read_versions
if errorlevel 1 goto :main_bad_versions
call :can_run_bun
if not "!CAN_BUN!"=="1" goto :main_os_skip
call :ensure_bun
goto :main_after_bun

:main_os_skip
call :log "Tento system nespusti Bun. Vydani !OS_RELEASE!."

:main_after_bun
call :ensure_pm2
goto :run_deps

:main_no_versions
call :log "versions.env chybi - kontrolu verzi preskakuji"
goto :run_deps

:main_bad_versions
call :log "versions.env je neuplny - kontrolu verzi preskakuji"

:run_deps
call :deps_ok
if errorlevel 1 call :log "Zavislosti chybi - panel presto spoustim"
cd /d "%STARTUP_DIR%"
if errorlevel 1 goto :main_no_dir
call pnpm run start
set "PNPM_RC=!ERRORLEVEL!"
exit /b !PNPM_RC!

:main_no_dir
call :log "Adresar !STARTUP_DIR! neexistuje - koncim"
exit /b 1

:log
set "LOG_MSG=%~1"
if not exist "%SOURCE_DIR%\logs" mkdir "%SOURCE_DIR%\logs"
echo %DATE% %TIME% - %LOG_MSG%
>>"%LOG_FILE%" echo %DATE% %TIME% - %LOG_MSG%
exit /b 0

:read_versions
set "BUN_VERSION="
set "BUN_WINDOWS_X64_SHA256="
set "PM2_VERSION="
for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%VERSIONS%") do (
  if "%%A"=="BUN_VERSION" set "BUN_VERSION=%%B"
  if "%%A"=="BUN_WINDOWS_X64_SHA256" set "BUN_WINDOWS_X64_SHA256=%%B"
  if "%%A"=="PM2_VERSION" set "PM2_VERSION=%%B"
)
if not "!BUN_VERSION!"=="" goto :read_versions_sha
call :log "BUN_VERSION chybi ve versions.env"
exit /b 1
:read_versions_sha
if not "!BUN_WINDOWS_X64_SHA256!"=="" goto :read_versions_pm2
call :log "BUN_WINDOWS_X64_SHA256 chybi ve versions.env"
exit /b 1
:read_versions_pm2
if not "!PM2_VERSION!"=="" goto :read_versions_ok
call :log "PM2_VERSION chybi ve versions.env"
exit /b 1
:read_versions_ok
exit /b 0

:can_run_bun
set "CAN_BUN=0"
set "OS_RELEASE="
if defined BABYBOX_OS_RELEASE set "OS_RELEASE=!BABYBOX_OS_RELEASE!"
if not defined BABYBOX_OS_RELEASE (
  for /f "tokens=4" %%A in ('ver') do set "OS_RELEASE=%%A"
)
set "OS_RELEASE=!OS_RELEASE:]=!"
set "OS_MAJOR="
set "OS_MINOR="
set "OS_BUILD="
for /f "tokens=1,2,3 delims=." %%A in ("!OS_RELEASE!") do (
  set "OS_MAJOR=%%A"
  set "OS_MINOR=%%B"
  set "OS_BUILD=%%C"
)
if not "!OS_MAJOR!"=="10" exit /b 0
if not "!OS_MINOR!"=="0" exit /b 0
if "!OS_BUILD!"=="" exit /b 0
set "NONDIG=!OS_BUILD!"
for %%D in (0 1 2 3 4 5 6 7 8 9) do set "NONDIG=!NONDIG:%%D=!"
if not "!NONDIG!"=="" exit /b 0
if !OS_BUILD! GEQ 17763 set "CAN_BUN=1"
exit /b 0

:ensure_bun
if not exist "%BUN_DIR%" mkdir "%BUN_DIR%"
call :probe_bun "%BUN_EXE%"
if not "!PROBE_STATUS!"=="0" goto :ensure_bun_after_match
call :version_matches "!PROBE_OUT!" "!BUN_VERSION!"
if errorlevel 1 goto :ensure_bun_after_match
call :clear_hold
exit /b 0

:ensure_bun_after_match
call :is_illegal "!PROBE_STATUS!"
if errorlevel 1 goto :ensure_bun_not_illegal
call :hold_matches
if not errorlevel 1 goto :ensure_bun_cpu
if not exist "%HOLD_FILE%" goto :ensure_bun_cpu
goto :ensure_bun_download

:ensure_bun_not_illegal
if not "!PROBE_STATUS!"=="127" goto :ensure_bun_download
call :hold_matches
if errorlevel 1 goto :ensure_bun_download

:ensure_bun_cpu
call :cpu_hold
exit /b 1

:ensure_bun_download
call :log "Stahuji Bun !BUN_VERSION!"
set "STAGE=%TEMP%\babybox-bun-!RANDOM!!RANDOM!"
mkdir "%STAGE%"
if errorlevel 1 goto :ensure_bun_download_fail
set "ZIP=!STAGE!\bun-windows-x64.zip"
set "URL=https://github.com/oven-sh/bun/releases/download/bun-v!BUN_VERSION!/bun-windows-x64.zip"
call curl -fsSL --retry 3 --retry-delay 2 -A babybox-bootstrap -o "!ZIP!" "!URL!"
if errorlevel 1 goto :ensure_bun_download_fail
call :sha256_file "!ZIP!"
if errorlevel 1 goto :ensure_bun_sha_fail
if /i not "!SHA_OUT!"=="!BUN_WINDOWS_X64_SHA256!" goto :ensure_bun_sha_fail
mkdir "%STAGE%\extract"
if errorlevel 1 goto :ensure_bun_unpack_fail
call tar -xf "!ZIP!" -C "!STAGE!\extract"
if errorlevel 1 goto :ensure_bun_unpack_fail
set "FOUND=!STAGE!\extract\bun-windows-x64\bun.exe"
if exist "!FOUND!" goto :ensure_bun_found
set "FOUND=!STAGE!\extract\bun.exe"
if exist "!FOUND!" goto :ensure_bun_found
set "FOUND="
for /d %%D in ("!STAGE!\extract\*") do (
  if exist "%%D\bun.exe" set "FOUND=%%D\bun.exe"
)
if not defined FOUND goto :ensure_bun_missing_exe
goto :ensure_bun_found

:ensure_bun_found
copy /y "!FOUND!" "!BUN_EXE!" >nul
if errorlevel 1 goto :ensure_bun_unpack_fail
call :cleanup_stage
call :probe_bun "!BUN_EXE!"
call :is_illegal "!PROBE_STATUS!"
if not errorlevel 1 goto :ensure_bun_cpu
if not "!PROBE_STATUS!"=="0" goto :ensure_bun_bad_version
call :version_matches "!PROBE_OUT!" "!BUN_VERSION!"
if errorlevel 1 goto :ensure_bun_bad_version
call :clear_hold
call :log "Bun !BUN_VERSION! je nainstalovany"
exit /b 0

:ensure_bun_bad_version
set "HAVE=!PROBE_OUT!"
if "!HAVE!"=="" set "HAVE=chybi"
call :log "Bun je !HAVE!, chceme !BUN_VERSION!"
exit /b 1

:ensure_bun_missing_exe
call :log "Rozbaleni Bun se nezdarilo. V archivu chybi bun."
call :cleanup_stage
exit /b 1

:ensure_bun_unpack_fail
call :log "Rozbaleni Bun se nezdarilo"
call :cleanup_stage
exit /b 1

:ensure_bun_sha_fail
call :log "Kontrolni soucet archivu Bun se neshoduje"
call :cleanup_stage
exit /b 1

:ensure_bun_download_fail
call :log "Stazeni Bun se nezdarilo"
call :cleanup_stage
exit /b 1

:cleanup_stage
if defined STAGE if exist "%STAGE%" rmdir /s /q "%STAGE%"
set "STAGE="
exit /b 0

:sha256_file
set "SHA_OUT="
set "SHA_TXT=%TEMP%\babybox-bun-sha-!RANDOM!.txt"
set "SHA_CAND=%TEMP%\babybox-bun-cand-!RANDOM!.txt"
call certutil -hashfile "%~1" SHA256 > "%SHA_TXT%"
if errorlevel 1 exit /b 1
for /f "usebackq delims=" %%L in ("%SHA_TXT%") do (
  set "SHA_LINE=%%L"
  set "SHA_LINE=!SHA_LINE: =!"
  call :take_sha64
)
del /q "%SHA_TXT%" "%SHA_CAND%" 2>nul
if "!SHA_OUT!"=="" exit /b 1
exit /b 0

:take_sha64
if "!SHA_LINE:~64!" neq "" exit /b 0
if "!SHA_LINE:~63,1!"=="" exit /b 0
>"%SHA_CAND%" echo(!SHA_LINE!
findstr /r "^[0-9A-Fa-f][0-9A-Fa-f]*$" "%SHA_CAND%" >nul
if errorlevel 1 exit /b 0
set "SHA_OUT=!SHA_LINE!"
exit /b 0

:probe_bun
set "PROBE_STATUS=0"
set "PROBE_OUT="
if exist "%~1" goto :probe_bun_run
set "PROBE_STATUS=127"
exit /b 0
:probe_bun_run
set "PROBE_FILE=%TEMP%\babybox-bun-probe.txt"
if exist "%PROBE_FILE%" del /q "%PROBE_FILE%"
"%~1" -v > "%PROBE_FILE%" 2>nul
set "PROBE_STATUS=!ERRORLEVEL!"
set "PROBE_OUT="
if exist "%PROBE_FILE%" set /p PROBE_OUT=<"%PROBE_FILE%"
set "PROBE_OUT=!PROBE_OUT: =!"
exit /b 0

:version_matches
if /i "%~1"=="%~2" exit /b 0
if /i "%~1"=="v%~2" exit /b 0
exit /b 1

:is_illegal
if "%~1"=="132" exit /b 0
if "%~1"=="-1073741795" exit /b 0
if "%~1"=="3221225501" exit /b 0
exit /b 1

:hold_matches
set "HOLD_VALUE="
if not exist "%HOLD_FILE%" exit /b 1
set /p HOLD_VALUE=<"%HOLD_FILE%"
set "HOLD_VALUE=!HOLD_VALUE: =!"
if "!HOLD_VALUE!"=="" exit /b 1
if "!HOLD_VALUE!"=="!BUN_VERSION!" exit /b 0
exit /b 1

:cpu_hold
if not exist "%USERPROFILE%\.bun" mkdir "%USERPROFILE%\.bun"
>"%HOLD_FILE%" echo !BUN_VERSION!
call :log "Procesor nespusti Bun. Krok CPU_HOLD."
exit /b 1

:clear_hold
if exist "%HOLD_FILE%" del /q "%HOLD_FILE%"
exit /b 0

:ensure_pm2
set "HAVE_PM2="
for /f "delims=" %%V in ('pm2 --version 2^>nul') do set "HAVE_PM2=%%V"
if "!HAVE_PM2!"=="!PM2_VERSION!" exit /b 0
call :log "Instaluji pm2 !PM2_VERSION!"
call npm install -g pm2@!PM2_VERSION!
if errorlevel 1 goto :ensure_pm2_fail
call pm2 update
if errorlevel 1 call :log "pm2 update selhal"
exit /b 0

:ensure_pm2_fail
call :log "pm2 se nepodarilo nainstalovat"
exit /b 1

:deps_ok
if not exist "%STARTUP_DIR%\node_modules\pino" exit /b 1
if not exist "%STARTUP_DIR%\..\backend\node_modules\express" exit /b 1
if not exist "%STARTUP_DIR%\..\configer\node_modules\express" exit /b 1
if not exist "%STARTUP_DIR%\..\panel\node_modules\vue" exit /b 1
exit /b 0
