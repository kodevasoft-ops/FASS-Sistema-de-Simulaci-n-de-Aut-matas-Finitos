@echo off
:: ============================================================
:: FASS v3 — Script de Arranque Automático para Windows
:: ============================================================
:: ¿Qué hace este script?
::   1. Verifica que Python esté instalado
::   2. Crea el entorno virtual si no existe
::   3. Instala las dependencias del backend (Flask)
::   4. Inicia el servidor Flask en el puerto 5000 (background)
::   5. Inicia el servidor del frontend en el puerto 8080 (background)
::   6. Abre el navegador automáticamente en http://localhost:8080
::   7. Mantiene una ventana de control para detener todo
::
:: Para ejecutar: doble clic en INICIAR_FASS.bat
:: Para detener:  presiona cualquier tecla en la ventana de control
:: ============================================================

title FASS v3 — Iniciando...
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║         FASS v3 — Finite Automata Simulation System ║
echo  ║              Script de Arranque Automatico          ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: ── Detectar la ruta del script (donde está este .bat) ────────────────────
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "VENV=%BACKEND%\venv"

echo  [INFO] Ruta del proyecto: %ROOT%
echo.

:: ── 1. Verificar que Python está instalado ────────────────────────────────
echo  [1/5] Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Python no esta instalado o no esta en el PATH.
    echo  Descargalo en: https://www.python.org/downloads/
    echo  Asegurate de marcar "Add Python to PATH" durante la instalacion.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo  [OK] %%v
echo.

:: ── 2. Crear entorno virtual si no existe ────────────────────────────────
echo  [2/5] Configurando entorno virtual...
if not exist "%VENV%\Scripts\activate.bat" (
    echo  [INFO] Creando entorno virtual en %VENV%...
    python -m venv "%VENV%"
    if %errorlevel% neq 0 (
        echo  [ERROR] No se pudo crear el entorno virtual.
        pause
        exit /b 1
    )
    echo  [OK] Entorno virtual creado.
) else (
    echo  [OK] Entorno virtual ya existe.
)
echo.

:: ── 3. Instalar dependencias ──────────────────────────────────────────────
echo  [3/5] Instalando dependencias del backend...
call "%VENV%\Scripts\activate.bat"
pip install -r "%BACKEND%\requirements.txt" --quiet
if %errorlevel% neq 0 (
    echo  [WARN] Algunas dependencias pueden no haberse instalado.
    echo  Intenta ejecutar manualmente: pip install flask flask-cors
) else (
    echo  [OK] Flask y dependencias instalados.
)
echo.

:: ── 4. Iniciar backend Flask en background ────────────────────────────────
echo  [4/5] Iniciando servidor Backend (Flask - puerto 5000)...
start "FASS Backend - Flask :5000" /min cmd /c "cd /d "%BACKEND%" && call "%VENV%\Scripts\activate.bat" && python app.py"

:: Esperar que Flask levante (2 segundos)
timeout /t 2 /nobreak >nul
echo  [OK] Backend iniciado en http://localhost:5000
echo.

:: ── 5. Iniciar frontend en background ────────────────────────────────────
echo  [5/5] Iniciando servidor Frontend (HTTP - puerto 8080)...
start "FASS Frontend - HTTP :8080" /min cmd /c "cd /d "%FRONTEND%" && python -m http.server 8080"

:: Esperar que el servidor HTTP levante (1 segundo)
timeout /t 1 /nobreak >nul
echo  [OK] Frontend iniciado en http://localhost:8080
echo.

:: ── 6. Abrir navegador ────────────────────────────────────────────────────
echo  Abriendo navegador en http://localhost:8080 ...
start "" "http://localhost:8080"
echo.

:: ── Ventana de control ────────────────────────────────────────────────────
title FASS v3 — En ejecucion (no cerrar)
color 0B

echo  ╔══════════════════════════════════════════════════════╗
echo  ║                  FASS v3 ACTIVO                     ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║  Frontend : http://localhost:8080                   ║
echo  ║  Backend  : http://localhost:5000                   ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║  Presiona cualquier tecla para DETENER todo         ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Si el navegador no abre automaticamente, visita:
echo  http://localhost:8080
echo.

pause >nul

:: ── Detener todos los servidores al salir ────────────────────────────────
echo.
echo  [INFO] Deteniendo servidores...

:: Cerrar ventanas de Flask y HTTP server por título
taskkill /fi "WindowTitle eq FASS Backend - Flask :5000*" /f >nul 2>&1
taskkill /fi "WindowTitle eq FASS Frontend - HTTP :8080*"  /f >nul 2>&1

:: Matar procesos Python que usen esos puertos (por si acaso)
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":5000 "') do (
    taskkill /pid %%p /f >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":8080 "') do (
    taskkill /pid %%p /f >nul 2>&1
)

echo  [OK] Servidores detenidos.
echo  [OK] FASS v3 cerrado correctamente.
echo.
timeout /t 2 /nobreak >nul
exit /b 0
