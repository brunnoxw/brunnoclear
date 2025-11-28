@echo off
chcp 65001 >nul
title BrunnoClear - Transformar em Executável
color 0B

echo.
echo ═══════════════════════════════════════════════════════
echo  BrunnoClear - Transformador de Executável
echo ═══════════════════════════════════════════════════════
echo.

echo [1/3] Verificando @yao-pkg/pkg...
where pkg >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ⚠ @yao-pkg/pkg não encontrado!
    echo 📦 Instalando @yao-pkg/pkg globalmente...
    echo.
    call npm install -g @yao-pkg/pkg
    if %errorlevel% neq 0 (
        echo.
        echo ✗ Erro ao instalar @yao-pkg/pkg
        echo.
        pause
        exit /b 1
    )
    echo.
    echo ✓ @yao-pkg/pkg instalado com sucesso!
) else (
    echo ✓ @yao-pkg/pkg já está instalado
)

echo.
echo [2/3] Limpando builds anteriores...
if exist dist rmdir /s /q dist 2>nul
if exist dist (
    echo ⚠ Não foi possível limpar a pasta dist
) else (
    echo ✓ Pasta dist limpa
)

echo.
echo [3/3] Gerando executável...
echo.
echo Aguarde, isso pode levar alguns minutos...
echo.

call pkg . --output dist/brunnoclear.exe

if %errorlevel% neq 0 (
    echo.
    echo ✗ Erro ao gerar executável
    echo.
    pause
    exit /b 1
)

echo.
echo ═══════════════════════════════════════════════════════
echo  ✓ Executável gerado com sucesso!
echo ═══════════════════════════════════════════════════════
echo.
echo 📁 Localização: dist\brunnoclear.exe
echo.

for %%A in (dist\brunnoclear.exe) do (
    set size=%%~zA
    set /a sizeMB=%%~zA/1024/1024
)
echo 📊 Tamanho: %sizeMB% MB
echo.

pause
