# 🚀 Quick Start Guide - Versão 2.0

## ⚡ VERSÃO 2.0 - Mudanças Importantes!

**Novo motor com 4 correções críticas:**
- ✅ 100% taxa de alocação (vs 13% antes)
- ✅ Sábado agora operacional
- ✅ Capacidade diária otimizada
- ✅ Excel export corrigido

**➜ Detalhes: [NOVIDADES.md](NOVIDADES.md)**

---

## Instalação Rápida (5 minutos)

### 1️⃣ Pré-requisitos
- Node.js 18+ instalado ([Download](https://nodejs.org))
- npm ou yarn
- Navegador moderno (Chrome, Firefox, Safari, Edge)

### 2️⃣ Setup Inicial

```bash
# Navegar para a pasta do projeto
cd "f:\Otimizador de Rotas"

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### 3️⃣ Acessar a Aplicação

Abra no navegador:
```
http://localhost:3002
```

Você verá a interface da aplicação!

---

## 📊 Primeiro Teste com v2.0

### ✨ Botões de Download Redesenhados

A interface agora mostra botões maiores com melhor visual:
- 🔵 **Template em Branco** - Azul
- 🟢 **Template com Exemplos** - Verde

#### Opção A: Template em Branco
1. Na aplicação, clique em **"Template em Branco"** (botão azul)
2. Arquivo `template_clientes.csv` será baixado
3. Abra em Excel, Google Sheets ou similar
4. Preencha com seus dados
5. Salve como CSV (UTF-8)
6. Faça upload na aplicação

#### Opção B: Template com Exemplos
1. Clique em **"Template com Exemplos"** (botão verde)
2. Arquivo com dados de exemplo será baixado
3. Veja como preencher cada coluna
4. Use como referência para seus dados

#### Opção C: Usar Arquivo de Exemplo (Teste Rápido)

Na seção "Importar Dados de Clientes", clique no dropzone e selecione `exemplo_clientes.csv` que já vem com a aplicação.

---

## 📋 Como Preencher o Template

Veja [GUIA_PREENCHIMENTO.md](GUIA_PREENCHIMENTO.md) para instruções detalhadas de preenchimento.

### Resumo Rápido

| Coluna | Exemplo | Obrigatório |
|--------|---------|------------|
| CÓD | 001 | ✅ Sim |
| NOME FANTASIA | Loja Centro | ✅ Sim |
| LATITUDE | -23.5505 | ✅ Sim |
| LONGITUDE | -46.6333 | ✅ Sim |
| TEMPO MÉDIO DE VISITA | 01:00:00 | ✅ Sim |
| FREQUÊNCIA | 2 | ✅ Sim |
| SEG a SAB | X (ou vazio) | ✅ Sim |
| ROTAS | ROTA_01 | ✅ Sim |

---

## 🛠️ Comandos Importantes

```bash
# Desenvolvimento
npm run dev              # Inicia servidor com hot-reload

# Build
npm run build            # Compila para produção

# Produção
npm start                # Inicia servidor otimizado

# Linting
npm run lint             # Verifica código

# Limpeza
rm -rf node_modules      # Remove dependências
rm -rf .next             # Remove cache
npm install              # Reinstala tudo
```

---

## 📝 Estrutura do CSV

Seu arquivo deve conter:

| Coluna | Tipo | Exemplo |
|--------|------|---------|
| CÓD | texto | 001 |
| NOME FANTASIA | texto | Loja Centro |
| LATITUDE | número | -23.5505 |
| LONGITUDE | número | -46.6333 |
| TEMPO MÉDIO DE VISITA | HH:MM:SS | 01:00:00 |
| FREQUÊNCIA | número | 2 |
| SEG, TER, QUA, QUI, SEX, SAB | X ou vazio | X |
| ROTAS | texto | ROTA_01 |

👉 Veja `exemplo_clientes.csv` para referência completa

---

## 🎯 Workflow Típico

```
1. Abrir http://localhost:3000
   ↓
2. Upload de arquivo CSV
   ↓
3. Revisar jornada de trabalho
   ↓
4. Clicar "Gerar Roteirização Otimizada"
   ↓
5. Explorar resultados
   ├─ Selecionar promotor
   ├─ Selecionar dia
   ├─ Ver mapa de rota
   └─ Revisar itinerário detalhado
```

---

## 🔧 Configurações

### Jornada de Trabalho (Padrão)
- Segunda a Sexta: 8 horas
- Sábado: 4 horas

Você pode alterar antes de otimizar.

### Velocidade Média de Viagem
- 40 km/h (configurável no código em `distanceUtils.ts`)

### Dias da Semana
- Segunda a Sábado (fixo)

---

## 📱 Acesso Remoto

### Deploy na Vercel (Recomendado)

```bash
# 1. Criar conta em vercel.com
# 2. Conectar repositório GitHub
# 3. Deploy automático

# Ou fazer deploy manual:
npm install -g vercel
vercel
```

Sua aplicação estará em: `https://seu-projeto.vercel.app`

---

## 🐛 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Porta 3000 em uso | `lsof -i :3000` e `kill -9 PID` |
| Erro npm install | `npm cache clean --force` e tentar novamente |
| Hot-reload não funciona | Recarregue página (Ctrl+F5) |
| Canvas não renderiza | Use navegador moderno ou recarregue |
| CSV não carrega | Verifique encoding UTF-8 |

---

## 📚 Documentação

- 📖 **[README.md](README.md)** - Overview geral
- 🧮 **[ALGORITMO.md](ALGORITMO.md)** - Lógica de otimização
- 💻 **[EXEMPLOS.md](EXEMPLOS.md)** - Exemplos de código
- ❓ **[FAQ.md](FAQ.md)** - Perguntas frequentes
- 📋 **[DOCUMENTACAO.md](DOCUMENTACAO.md)** - Estrutura completa

---

## 💡 Dicas

✅ Use `exemplo_clientes.csv` para entender o formato  
✅ Comece com poucos clientes (< 50) para testar  
✅ Ajuste a jornada de trabalho antes de otimizar  
✅ Verifique os avisos da otimização  
✅ Mantenha coordenadas precisas  

---

## 📞 Próximas Ações

1. **Setup**: Siga o guia acima
2. **Teste**: Use `exemplo_clientes.csv`
3. **Customize**: Prepare seu próprio arquivo
4. **Deploy**: Coloque em produção (Vercel)
5. **Integre**: Use em seu sistema

---

## ✨ Recursos

- ✅ Upload de arquivos CSV/Excel
- ✅ Otimização automática de rotas
- ✅ Visualização em mapa
- ✅ Tabela de itinerário detalhada
- ✅ Configuração de jornada flexível
- ✅ Alertas e avisos inteligentes
- ✅ Interface responsiva e moderna

---

**Pronto para começar? Execute os comandos acima e boa sorte! 🚀**
