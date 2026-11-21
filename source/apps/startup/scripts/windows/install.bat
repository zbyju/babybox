@echo off
setlocal
node "%~dp0..\..\fresh-install.js"
exit /b %ERRORLEVEL%
