@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo   PlanoMEC - iniciando...
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  [ERRO] Node.js nao encontrado.
  echo  Instale em: https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo  Abrindo http://localhost:3847
echo  (Mantenha esta janela aberta. Feche para parar.)
echo.
node server.js
if errorlevel 1 (
  echo.
  echo  [ERRO] Nao foi possivel iniciar. Porta 3847 em uso?
  echo  Feche outros terminais do PlanoMEC e tente de novo.
  echo.
)
pause
