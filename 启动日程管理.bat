@echo off
chcp 65001 >nul
title 日程管理 [开发版]
cd /d "%~dp0"

REM 启动本地 HTTP 服务
start "" /MIN cmd /c "C:\Users\lenovo\.workbuddy\binaries\python\versions\3.13.12\python.exe -m http.server 8889"

REM 等服务就绪
timeout /t 3 /nobreak >nul

REM 用 Electron 打开
node_modules\.bin\electron.cmd . http://localhost:8889/index.html