@echo off
chcp 65001 >nul
title 29 Mayis Universitesi - Ders Programi Sistemi
echo ================================================================
echo   ISTANBUL 29 MAYIS UNIVERSITESI DERS PROGRAMI SISTEMI
echo ================================================================
echo.
echo Sunucu baslatiliyor...
start http://localhost:8080/login.html
C:\Users\yekayacan\AppData\Local\Programs\Python\Python312\python.exe server.py
pause
