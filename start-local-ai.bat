@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local-ai.ps1" %*
if errorlevel 1 (
  echo.
  echo Local AI could not be started.
  pause
  exit /b 1
)
