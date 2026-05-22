@echo off
:: ============================================================
:: FASS v3 — Script para detener los servidores
:: Úsalo si cerraste la ventana de control sin presionar tecla
:: ============================================================
title FASS v3 — Deteniendo servidores
color 0C

echo.
echo  [FASS] Deteniendo todos los servidores...
echo.

:: Cerrar por título de ventana
taskkill /fi "WindowTitle eq FASS Backend - Flask :5000*" /f >nul 2>&1
taskkill /fi "WindowTitle eq FASS Frontend - HTTP :8080*"  /f >nul 2>&1

:: Liberar puertos 5000 y 8080
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":5000 "') do (
    echo  [INFO] Cerrando proceso en puerto 5000 (PID: %%p)
    taskkill /pid %%p /f >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":8080 "') do (
    echo  [INFO] Cerrando proceso en puerto 8080 (PID: %%p)
    taskkill /pid %%p /f >nul 2>&1
)

echo  [OK] Servidores detenidos.
timeout /t 2 /nobreak >nul
