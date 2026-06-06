@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-local-ai.ps1" %*
if errorlevel 1 (
  echo.
  echo Local AI could not be stopped safely.
  pause
  exit /b 1
)
