@echo off
REM Wrapper so PowerShell / cmd users can run the same script as bash.
REM Requires git-bash (ships with Git for Windows) on PATH.
where bash >nul 2>nul
if errorlevel 1 (
  echo bash not found on PATH. Install Git for Windows or run from git-bash.
  exit /b 1
)
bash "%~dp0push-next.sh" %*
