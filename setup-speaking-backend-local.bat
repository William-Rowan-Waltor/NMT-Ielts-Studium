@echo off
setlocal
cd /d "%~dp0speaking-backend"

where py.exe >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=py -3"
) else (
  where python.exe >nul 2>nul
  if errorlevel 1 (
    echo Python 3 was not found. Install Python 3, then run this file again.
    pause
    exit /b 1
  )
  set "PYTHON_CMD=python"
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating Speaking backend virtual environment...
  %PYTHON_CMD% -m venv .venv
  if errorlevel 1 goto :failed
)

echo Installing Speaking backend dependencies...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto :failed

if not exist ".env" (
  copy /y ".env.local-ollama.example" ".env" >nul
  echo Created speaking-backend\.env for project-local Ollama.
) else (
  echo Existing speaking-backend\.env kept unchanged.
)

".venv\Scripts\python.exe" -m src.seed_questions
if errorlevel 1 goto :failed

echo.
echo Speaking backend local setup is complete.
echo Start local AI first, then run start-speaking-backend.bat.
exit /b 0

:failed
echo.
echo Speaking backend setup failed.
pause
exit /b 1
