@echo off
REM Setup Script for Route Optimizer (Windows)

echo.
echo 🚀 Otimizador de Rotas - Setup Script (Windows)
echo ================================================
echo.

REM Check Node.js
echo ✓ Verificando Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js não encontrado. Por favor instale em: https://nodejs.org
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% instalado
echo.

REM Install dependencies
echo 📦 Instalando dependências...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erro ao instalar dependências
    exit /b 1
)
echo ✅ Dependências instaladas
echo.

REM Create .env if doesn't exist
if not exist .env.local (
    echo 📝 Criando .env.local...
    copy .env.example .env.local
    echo ✅ .env.local criado
) else (
    echo ✅ .env.local já existe
)
echo.

REM Display instructions
echo 🎉 Setup completo!
echo.
echo Para iniciar o servidor:
echo   npm run dev
echo.
echo Depois acesse: http://localhost:3000
echo.
echo Para mais informações, veja QUICKSTART.md
echo.
pause
