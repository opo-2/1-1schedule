@echo off
chcp 65001 >nul
:: 开机自启：将此脚本的快捷方式放到 shell:startup 文件夹即可
start /min "" "%~dp0启动日程管理.bat"
exit