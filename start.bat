@echo off
title LoL Matchup Analyzer
echo ========================================================
echo       Avvio LoL Matchup Analyzer
echo ========================================================
echo.
echo Avvio del server locale su http://localhost:8080/ ...
start "" "http://localhost:8080/"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080
pause
