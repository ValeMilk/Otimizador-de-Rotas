#!/bin/bash
# Setup Script for Route Optimizer

echo "🚀 Otimizador de Rotas - Setup Script"
echo "======================================"
echo ""

# Check Node.js
echo "✓ Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor instale em: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION instalado"
echo ""

# Install dependencies
echo "📦 Instalando dependências..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi
echo "✅ Dependências instaladas"
echo ""

# Create .env if doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Criando .env.local..."
    cp .env.example .env.local
    echo "✅ .env.local criado"
else
    echo "✅ .env.local já existe"
fi
echo ""

# Start dev server
echo "🎉 Setup completo!"
echo ""
echo "Para iniciar o servidor:"
echo "  npm run dev"
echo ""
echo "Depois acesse: http://localhost:3000"
echo ""
echo "Para mais informações, veja QUICKSTART.md"
