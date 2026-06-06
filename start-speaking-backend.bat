@echo off
setlocal

cd /d "%~dp0speaking-backend"

if not exist ".venv\Scripts\python.exe" (
  echo Speaking backend virtual environment was not found.
  echo.
  echo Run this once from the speaking-backend folder:
  echo   python -m venv .venv
  echo   .venv\Scripts\python.exe -m pip install -r requirements.txt
  echo   copy .env.example .env
  echo Then edit .env and set EXAMINER_API_KEY.
  echo.
  echo Or for a local Ollama examiner, run setup-speaking-backend-local.bat.
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  echo speaking-backend\.env was not found.
  echo.
  echo Copy .env.example to .env, then set EXAMINER_API_KEY.
  echo Or run setup-speaking-backend-local.bat for a local Ollama examiner.
  echo.
  pause
  exit /b 1
)

echo Starting IELTS Speaking backend on http://127.0.0.1:8000
echo Keep this window open while using Speaking.
echo.
".venv\Scripts\python.exe" -m uvicorn src.main:app --host 127.0.0.1 --port 8000

echo.
echo Speaking backend stopped.
pause
