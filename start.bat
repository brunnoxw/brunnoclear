@echo off
echo.
echo ============================================
echo   BrunnoClear - Setup e Execucao
echo ============================================
echo.

if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    echo.
    call npm install
    echo.
    echo [OK] Dependencias instaladas!
    echo.
) else (
    echo [OK] Dependencias ja instaladas.
    echo.
)

if not exist "config.json" (
    echo [INFO] Primeira execucao detectada.
    echo [INFO] O arquivo config.json sera criado automaticamente.
    echo.
)

echo [INFO] Iniciando BrunnoClear...
echo.
echo ============================================
echo.

node index.js

echo.
echo ============================================
echo   Programa encerrado
echo ============================================
pause
