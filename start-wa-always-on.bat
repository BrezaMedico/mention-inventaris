@echo off
title MENTION WhatsApp Service - 24/7 Always-On
cls
echo ========================================================
echo   MENTION WHATSAPP 24/7 ALWAYS-ON WATCHDOG RUNNER
echo ========================================================
echo   Service: Node.js Microservice
echo   Port   : 3001
echo   Mode   : Persistent Auto-Restart Loop (24/7)
echo ========================================================
echo.

cd /d "%~dp0whatsapp-service"

:loop
echo [%date% %time%] [START] Menjalankan WhatsApp Microservice 24/7...
node server.mjs
echo.
echo ========================================================
echo [%date% %time%] [WARNING] Service terhenti atau koneksi reset!
echo Menghidupkan kembali service dalam 3 detik...
echo ========================================================
timeout /t 3 /nobreak >nul
goto loop
