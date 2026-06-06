@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-local-ai.ps1" %*
if errorlevel 1 (
  echo.
  echo Local AI setup failed.
  pause
  exit /b 1
)
