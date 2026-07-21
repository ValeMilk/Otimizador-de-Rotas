# 🔧 Setup Guide - GitHub Pages Deployment

Guia passo-a-passo para ativar o GitHub Pages e fazer deploy automático do Otimizador de Rotas.

## ⚠️ **Importante: Seu Repositório Precisa Ser Público**

GitHub Pages gratuito requer repositório **público**. Verifique em:
- **Settings → General → Visibility** → Deve estar como **Public** ✅

---

## 🚀 **Passo 1: Ativar GitHub Pages**

### 1.1 Acesse as Configurações de Pages

1. Va para seu repositório: https://github.com/ValeMilk/Otimizador-de-Rotas
2. Clique em **Settings** (engrenagem no topo)
3. No menu esquerdo, clique em **Pages**

### 1.2 Configure Build and Deployment

Na página de **Pages**, você verá a seção **"Build and deployment"**:

```
📍 Build and deployment
├─ Source
│  └─ [Deploy from a branch ✗]  ← Mude para GitHub Actions
└─ Branch
   └─ gh-pages (automatic)
```

**Ação:**
1. Clique no dropdown que diz **"Deploy from a branch"**
2. Selecione **`GitHub Actions`** 
3. Clique em **Save**

### 1.3 Aguarde a Confirmação

Você deve ver:
```
✅ Your site is live at https://valemilk.github.io/Otimizador-de-Rotas/
```

---

## 🔄 **Passo 2: Verificar o Workflow**

O repositório já tem o workflow configurado (`.github/workflows/deploy.yml`).

### 2.1 Acompanhe o Build

1. Va para: **https://github.com/ValeMilk/Otimizador-de-Rotas/actions**
2. Você deve ver um workflow sendo executado
3. Aguarde terminar (verde ✅ = sucesso, vermelho ❌ = erro)

### 2.2 O Que o Workflow Faz

```
┌─────────────────────────────────────┐
│ 1. Checkout do código               │
├─────────────────────────────────────┤
│ 2. Setup Node.js 24                 │
├─────────────────────────────────────┤
│ 3. npm install (dependências)       │
├─────────────────────────────────────┤
│ 4. npm run build (static export)    │
├─────────────────────────────────────┤
│ 5. Upload artifact para /out        │
├─────────────────────────────────────┤
│ 6. Deploy para gh-pages             │
└─────────────────────────────────────┘
```

---

## ✅ **Passo 3: Validar o Deploy**

### 3.1 Acesse o Site

Após o workflow completar (verde ✅), abra:
```
https://valemilk.github.io/Otimizador-de-Rotas/
```

Você deve ver a interface do Otimizador carregando normalmente.

### 3.2 Teste Básico

1. Clique em "Choose File"
2. Selecione `auto_servico_2026_corrigido.csv`
3. Clique em "Gerar Roteirização Otimizada"
4. Verifique se os resultados aparecem

---

## 🔁 **Futuras Atualizações (Automático)**

Após ativar GitHub Pages uma vez:

**Todo push para `main` vai:**
- ✅ Triggar o workflow automaticamente
- ✅ Fazer build do projeto
- ✅ Deploy para `gh-pages`
- ✅ Site atualiza em ~2-3 minutos

**Exemplo:**
```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
# → Workflow dispara automaticamente
# → Seu site atualiza sozinho em poucos minutos
```

---

## 🐛 **Troubleshooting**

### ❌ "Source not available" / "GitHub Actions not showing"

**Solução:**
1. Verifique se repositório é **PUBLIC** (não private)
2. Verifique se tem permissão de admin no repo
3. Tente atualizar a página (F5) e repetir

### ❌ Workflow com erro 404 ("Not Found")

**Solução:**
- Confirme que Source em Pages está em **"GitHub Actions"** (não "Deploy from a branch")
- Reexecute o workflow:
  - Va para **Actions → Deploy to GitHub Pages**
  - Clique em **"Re-run failed jobs"** ou **"Re-run all jobs"**

### ❌ Site carrega mas sem CSS/estilos

**Solução:**
- Limpe cache do navegador (Ctrl+Shift+Delete)
- Aguarde 5 minutos (cache de CDN)
- Teste em navegador privado/incognito

### ❌ Site mostra 404

**Verificações:**
1. GitHub Pages está ativo? (Settings → Pages deve mostrar URL)
2. Workflow completou com sucesso? (Actions → verde ✅)
3. URL está correta? `https://valemilk.github.io/Otimizador-de-Rotas/`
   - ⚠️ Não esqueça a `/` no final
   - ⚠️ Repositório é `Otimizador-de-Rotas` (case-sensitive!)

---

## 📊 **Status Esperado**

Se tudo estiver certo, você verá:

```
Settings → Pages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Your site is live at https://valemilk.github.io/Otimizador-de-Rotas/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build and deployment
  Source: GitHub Actions ✅
  Last deployment by ValeMilk on [DATA]
```

---

## 🎯 **URLs Importantes**

| Recurso | URL |
|---------|-----|
| 🏠 Site Publicado | https://valemilk.github.io/Otimizador-de-Rotas/ |
| 📋 Código Fonte | https://github.com/ValeMilk/Otimizador-de-Rotas |
| ⚙️ GitHub Pages Config | https://github.com/ValeMilk/Otimizador-de-Rotas/settings/pages |
| 🔄 Workflows | https://github.com/ValeMilk/Otimizador-de-Rotas/actions |
| 🐛 Issues | https://github.com/ValeMilk/Otimizador-de-Rotas/issues |

---

## 💡 **Tips Avançados**

### Customizar o domínio

Se tiver domínio próprio, pode apontar para:
```
Settings → Pages → Custom domain
```

Adicione: `seu-dominio.com.br`

### Desabilitar o workflow

Se precisar pausar deployments:
1. Delete ou desabilite `.github/workflows/deploy.yml`
2. Push as changes
3. Próximos commits não farão deploy

### Ver logs detalhados do workflow

1. Va para **Actions**
2. Clique no workflow mais recente
3. Clique no job **"build-and-deploy"**
4. Expanda cada step para ver output detalhado

---

## ✨ **Pronto!**

Depois que ativar GitHub Pages seguindo este guide, seu site vai:
- ✅ Estar online em https://valemilk.github.io/Otimizador-de-Rotas/
- ✅ Atualizar automaticamente a cada push
- ✅ Funcionar sem servidor (static hosting)
- ✅ Ter uptime garantido pelo GitHub

**Qualquer dúvida, abra uma issue no repositório!** 🚀
