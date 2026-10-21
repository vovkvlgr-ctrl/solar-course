@echo off
chcp 65001 >nul
title Academy site
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\server.ps1"
pause
