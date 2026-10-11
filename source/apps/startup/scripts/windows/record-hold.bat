@echo off
setlocal EnableExtensions
node "%~dp0..\..\last-record.js" %~1 %~2 "%~3" "%~4"
exit /b %ERRORLEVEL%
