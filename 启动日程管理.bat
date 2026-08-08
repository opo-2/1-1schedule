@echo off
chcp 65001 >nul
title 日程管理
cd /d "%~dp0"
call npm run electron:dev