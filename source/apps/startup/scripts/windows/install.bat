@echo off
setlocal
pushd "%~dp0..\.."
if errorlevel 1 exit /b 1
node install-workspace.js
if errorlevel 1 goto :finish
node src\index.js --install
:finish
set "RC=%ERRORLEVEL%"
popd
exit /b %RC%
