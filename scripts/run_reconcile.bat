@echo off
REM ============================================================================
REM PlantKB maintenance entry point for Windows Task Scheduler.
REM
REM Schedule THIS .bat (not python.exe directly) so the three Windows gotchas
REM are handled in one place:
REM
REM  1. Working directory: config.DATA_DIR defaults to "data" (relative), so
REM     the DB/manifest are resolved from the current dir. %~dp0 is this file's
REM     folder (scripts\), so ..\ is the repo root -- we cd there first.
REM  2. Interpreter: use the full path to the Python that actually has the
REM     project deps installed. The "py" launcher resolves to a different 3.14
REM     that does NOT have sentence-transformers/unstructured. Edit the line
REM     below if you move to a venv (e.g. ..\.venv\Scripts\python.exe).
REM  3. User context: the deps live in this user's per-user site-packages
REM     (%APPDATA%\Python\Python314\site-packages), so the scheduled task MUST
REM     run under this same user account or Python won't find them.
REM ============================================================================
cd /d "%~dp0.."
"C:\Python314\python.exe" scripts\run_reconcile.py
exit /b %ERRORLEVEL%
