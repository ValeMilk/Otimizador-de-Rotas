# 🚗 Otimizador de Rotas de Vendas

Sistema inteligente de roteirização para promotores de vendas com otimização geográfica e alocação automática de clientes.

## ✨ Funcionalidades

- **Geolocalização Inteligente**: Agrupa clientes por proximidade geográfica (máx 3km de raio)
- **Alocação 100% Garantida**: Opção A - cria rotas solo se necessário para alocar todos os clientes
- **Cálculo de Utilização**: Respeita jornada de trabalho (44h semanais obrigatórias)
- **Visualização em Mapa**: Leaflet + OpenStreetMap com filtros por rota e dia
- **Export em Excel**: Relatórios completos das rotas e alocações
- **Interface Responsiva**: Design moderno com Tailwind CSS

## 🎯 Versão Atual

**v4.8.2** - Opção A Implementada
- ✅ 135/135 clientes alocados (100%)
- ✅ 12 rotas (8 compactas + 4 solo)
- ✅ 92.68% utilização média

## 🚀 Quick Start (Local)

### Pré-requisitos
- Node.js 24+
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone https://github.com/ValeMilk/Otimizador-de-Rotas.git
cd Otimizador-de-Rotas

# Instale dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse: **http://localhost:3005**

## 📊 Como Usar

### 1. **Importar Dados de Clientes**
- Clique em "Choose File" e selecione um CSV/Excel
- Formato esperado: `CÓD;NOME;LAT;LNG;TEMPO_MÉDIO;FREQUÊNCIA;SEG;TER;QUA;QUI;SEX;SAB`

### 2. **Configurar Jornada (Opcional)**
- Ajuste as horas diárias (padrão: 8h seg-sex, 4h sábado)
- Total obrigatório: 44h/semana (2640 minutos)

### 3. **Configurar Promotores (Opcional)**
- Adicione manualmente ou importe via CSV
- Serão alocados automaticamente às rotas
- Se vazio, sistema cria rotas dinamicamente

### 4. **Gerar Otimização**
- Clique em "Gerar Roteirização Otimizada"
- Sistema criará rotas compactas + solo routes se necessário
- Resultados mostram: total de promotores, clientes alocados, utilização média

### 5. **Visualizar & Exportar**
- Veja rotas no mapa (filtro por rota/dia)
- Clique em "Exportar Rotas (.xlsx)" para download

## 🌐 Deploy no GitHub Pages

### ✅ Pré-requisito: Ativar GitHub Pages

**IMPORTANTE:** Para ativar o deploy automático:

1. Va para: **https://github.com/ValeMilk/Otimizador-de-Rotas/settings/pages**
2. Em **"Build and deployment"**:
   - Source: Selecione **`GitHub Actions`** (não "Deploy from a branch")
   - Clique em **Save**
3. Aguarde o workflow rodar (https://github.com/ValeMilk/Otimizador-de-Rotas/actions)

**Seu app estará em:** https://valemilk.github.io/Otimizador-de-Rotas/

### ⚙️ Workflow Automático

Todo push na branch `main` dispara:
- ✅ Build do Next.js com static export
- ✅ Deploy automático via GitHub Actions
- ✅ Artefato salvo na branch `gh-pages`

## 🏗️ Arquitetura

### Frontend
- **Next.js 14** com TypeScript
- **Tailwind CSS** para styling
- **Leaflet** para mapas interativos
- **React Hooks** para gerenciamento de estado

### Backend
- **API Routes** do Next.js (App Router)
- Algoritmo geográfico greedy-based
- Haversine formula + fallback OSRM para distâncias
- Export via `exceljs`

### Algoritmo (v4.8.2)

**Fase 1: Rotas Geographicamente Compactas**
- Seed selection por frequência do cliente
- Nucleus formation com 1-2 nearest neighbors
- Centroid congelado (previne drift)
- **Hard stop em 3km** (sem exceções)
- ≤ 8-10 rotas compactas com 10-15 clientes cada

**Fase 1B: Rotas Solo para Clientes Restantes**
- Para clientes não alocados na Fase 1
- Cria 1 rota por cliente não alocado
- Aceita 60-70% utilização (vs 90%+ das compactas)
- **Garante 100% alocação (Opção A)**

**Fase 2: Atribuição a Promotores**
- Calcula centroid de cada rota
- Aloca ao promoter mais próximo por distância Haversine

## 📁 Estrutura do Projeto

```
.
├── app/
│   ├── page.tsx                      # Home page principal
│   └── api/debug-export/             # Endpoints de debug
├── components/
│   ├── MapLeafletRoutes.tsx          # Visualização de mapa
│   ├── ResultsDashboard.tsx          # Dashboard de resultados
│   └── PromotersConfiguration.tsx    # Config de promotores
├── utils/
│   ├── dynamicRouteGenerator.ts      # Core algorithm (v4.8.2)
│   ├── exportRoutesExcelNew.ts       # Export para Excel
│   └── timeUtils.ts                  # Utilitários de tempo
├── .github/workflows/
│   └── deploy.yml                    # GitHub Actions CI/CD
├── public/
│   └── debug-export.json             # Debug data
├── next.config.js                    # Config Next.js (static export)
├── tailwind.config.js                # Config Tailwind
└── package.json                      # Dependências
```

## 🔧 Configuração

### Environment Variables
Não requer `.env` para funcionamento local (mapas usam tiles públicos do OpenStreetMap)

### Build Estático
```bash
npm run build  # Gera /out com static export
npm run build-static  # Alternativo (se definido em package.json)
```

### Desenvolvimento
```bash
npm run dev    # Inicia em http://localhost:3005
npm run lint   # TypeScript check
```

## 📊 Dados de Teste

Use o arquivo fornecido: `auto_servico_2026_corrigido.csv`
- 135 clientes em Fortaleza/Maracanaú/Caucaia
- Frequências variadas (1-60 minutos de visitação)
- Coordenadas georreferenciadas completas
- Disponibilidade por dia da semana

## 🐛 Troubleshooting

### Mapa não carrega
- Verifique conexão com internet (OpenStreetMap requer acesso)
- Verifique console do navegador (F12 → Console)
- Procure por erros de CORS ou tile requests

### Clientes não alocados
- Se < 135 clientes: frequência total pode exceder 44h/semana
  - Solução: Aumente horas diárias em "Configurar Jornada"
- Se aparecer "não alocado após rebalanceamento": Opção A está funcionando
  - O sistema cria rotas solo para garantir 100% alocação

### Erro ao exportar Excel
- Verifique permissões de download do navegador
- Tente navegador diferente (Chrome recomendado)
- Limpe cache do navegador

### GitHub Pages deploy falhando
- Verifique se Pages está habilitado: https://github.com/ValeMilk/Otimizador-de-Rotas/settings/pages
- Verifique Actions → último workflow para logs detalhados
- Confirme se Source está em "GitHub Actions"

## 📝 Changelog

### v4.8.2 (Atual - 21 Jul 2026)
- ✅ **Opção A Completa**: 135/135 clientes garantidos
- ✅ 12 rotas automáticas (8 compactas + 4 solo)
- ✅ Rebalanceamento desativado para máxima alocação
- ✅ GitHub Pages com CI/CD automático (Node 24)

### v4.8
- Removeu `limiteRotas` (rotas ilimitadas)
- Implementou hard 3km stop condition
- Adicionou FASE 1B solo routes

### v4.7+
- Centroid congelado (previne drift)
- 3km radius limit rigoroso
- Greedy geographic algorithm

## 🚀 Performance

**Tempo de execução típico:**
- Build: ~40 segundos
- Route generation (135 clientes): <2 segundos
- Export Excel: <1 segundo

**Limites:**
- ✅ Até 500 clientes (testado)
- ✅ Até 50 promotores
- ✅ 6 dias semana (seg-sab)

## 📞 Suporte

Para issues ou sugestões, abra uma issue no GitHub:
https://github.com/ValeMilk/Otimizador-de-Rotas/issues

## 📄 Licença

MIT - Sinta-se livre para usar, modificar e distribuir!

---

**Made with ❤️ para otimizar vendas em Fortaleza**
