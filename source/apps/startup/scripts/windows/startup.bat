@echo off
REM ============================================================================
REM Babybox - spusteni panelu (Windows)
REM
REM Zastupce ve slozce StartUp odkazuje na tento soubor. Nesmi se presunout
REM ani prejmenovat, jinak se panel nespusti.
REM
REM Skript nejdriv srovna verze nastroju podle versions.env a pak spusti panel.
REM Zadny krok nesmi spusteni zastavit - chyby se jen vypisou a pokracuje se
REM s tim, co uz na pocitaci je.
REM ============================================================================

cd ../../

if not exist versions.env (
  echo versions.env chybi - kontrolu verzi preskakuji
  goto deps
)

set "NODE_VERSION="
set "PNPM_VERSION="
set "PM2_VERSION="

for /f "usebackq eol=# tokens=1,2 delims==" %%a in ("versions.env") do (
  if "%%a"=="NODE_VERSION" set NODE_VERSION=%%b
  if "%%a"=="PNPM_VERSION" set PNPM_VERSION=%%b
  if "%%a"=="PM2_VERSION" set PM2_VERSION=%%b
)

REM Prazdna hodnota by se poslala do npm jako "pnpm@", coz npm cte jako latest.
REM Radeji nesrovnavame nic, nez abychom nainstalovali neco nepinnuteho.
if "%NODE_VERSION%"=="" goto badversions
if "%PNPM_VERSION%"=="" goto badversions
if "%PM2_VERSION%"=="" goto badversions
goto versionsok

:badversions
echo versions.env je neuplny - kontrolu verzi preskakuji
goto deps

:versionsok

REM Windows nema spravce verzi Node (na Ubuntu to resi 'n'), takze verzi jen
REM hlasime a instalaci musi udelat clovek.
for /f "delims=" %%v in ('node -v 2^>nul') do set HAVE_NODE=%%v
if not "%HAVE_NODE%"=="v%NODE_VERSION%" (
  echo POZOR: Node je %HAVE_NODE%, ma byt v%NODE_VERSION% - nainstalujte rucne
)

for /f "delims=" %%v in ('pnpm --version 2^>nul') do set HAVE_PNPM=%%v
if not "%HAVE_PNPM%"=="%PNPM_VERSION%" (
  echo Instaluji pnpm %PNPM_VERSION%
  call npm install -g pnpm@%PNPM_VERSION% || echo pnpm se nepodarilo nainstalovat
)

for /f "delims=" %%v in ('pm2 --version 2^>nul') do set HAVE_PM2=%%v
if not "%HAVE_PM2%"=="%PM2_VERSION%" (
  echo Instaluji pm2 %PM2_VERSION%
  call npm install -g pm2@%PM2_VERSION% || echo pm2 se nepodarilo nainstalovat
  REM Bezici demon zustane na stare verzi, dokud ho pm2 update nerestartuje
  call pm2 update || echo pm2 update selhal
)

:deps
call pnpm install --frozen-lockfile
if not errorlevel 1 goto start
echo pnpm install selhal

REM Kdyz zavislosti porad funguji, nechame je byt. Smazat je a spolehnout se na
REM novou instalaci by pri vypadku site nechalo pocitac uplne bez node_modules.
call node -e "require('winston'); require('fs-extra')" >nul 2>&1
if not errorlevel 1 (
  echo Pokracuji se stavajicimi node_modules
  goto start
)

echo Zavislosti nefunguji - zkousim cistou instalaci
rmdir /s /q ..\..\node_modules 2>nul
for /d %%d in (..\*) do rmdir /s /q "%%d\node_modules" 2>nul
call pnpm install --frozen-lockfile || echo pnpm install selhal i po vycisteni

:start

call node src/index.js
