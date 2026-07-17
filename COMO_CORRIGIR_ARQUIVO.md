# 📝 Guia Prático: Por que seu arquivo foi rejeitado? - v2.0

## ✅ Boa Notícia: v2.0 Aumentou Compatibilidade!

Com as correções da v2.0, arquivos que falhavam antes agora funcionam:
- ✅ Sábado agora é aceito (antes era ignorado)
- ✅ Gap entre dias funciona corretamente
- ✅ 100% dos clientes válidos são alocáveis

Mesmo assim, estas regras ainda se aplicam:

## 🗺️ Como Copiar Coordenadas do Google Maps

### ✅ Google Maps SEMPRE usa PONTO decimal
Quando você clica em um local no Google Maps, as coordenadas aparecem assim:
```
-3.739042, -38.592444    ✅ CORRETO (ponto)
```

### ⚠️ Excel pode converter automaticamente
Se você **colar direto no Excel**, a regional do Windows pode converter:
```
Google Maps:  -3.739042
Você cola:    -3.739042
Excel mostra: -3,739042    ❌ CONVERTIDO (vírgula)
```

### ✅ Como copiar corretamente

**Opção 1: Copiar e Colar com Controle**
1. Clique na coordenada no Google Maps
2. Copie: `-23.5505, -46.6333`
3. Abra **Bloco de Notas** primeiro
4. Cole no Bloco de Notas (vai ficar com ponto)
5. **Depois** copie do Bloco de Notas pro Excel

**Opção 2: Usar Template**
1. Baixe "Template com Exemplos"
2. Copie a estrutura (headers + uma linha de exemplo)
3. Substitua apenas os valores, mantendo formato

**Opção 3: Verificar Formato Regional do Excel**
1. Se seu Excel está em português, pode converter pontos → vírgulas
2. No Excel: `Formatar → Células → Números`
3. Escolha "Número" e confirme que usa **ponto** como decimal

---

## 🔴 Os 5 Erros Mais Comuns

### 1. 🔴 **Coordenadas com VÍRGULA em vez de PONTO**
```
❌ ERRADO:      -23,5505    ou    -46,6333
✅ CORRETO:    -23.5505    ou    -46.6333
```
**Por quê?** Quando usa vírgula, o Excel/sistema entende como separador de milhares, não decimal.

### 2. 🔴 **Coordenadas ZERADAS ou VAZIAS**
```
❌ ERRADO:      0      ou      0.0      ou    [vazio]
✅ CORRETO:    -23.5505    ou    -46.6333
```
**Por quê?** Coordenadas de 0,0 indicam "sem dados" (significa Oceano Atlântico!).

### 3. 🔴 **Frequência vazia ou como TEXTO**
```
❌ ERRADO:      [vazio]     ou     "duas"     ou     1.5
✅ CORRETO:    1     ou     2     ou     3     (número inteiro)
```
**Por quê?** Frequência deve ser número inteiro de 1 a 6.

### 4. 🔴 **Tempo no formato ERRADO**
```
❌ ERRADO:      1:00      ou     01h      ou     60 min
✅ CORRETO:    01:00:00   ou     00:30:00
```
**Formato obrigatório:** HH:MM:SS

### 5. 🔴 **CÓD ou NOME FANTASIA vazios**
```
❌ ERRADO:      [vazio]
✅ CORRETO:    001      ou     Loja Centro
```
**Por quê?** Todo cliente precisa ter identificação.

---

## 🎯 Passo a Passo: Como Corrigir

### **Opção A: Usar Template com Exemplos (RECOMENDADO)**

1. Clique em **"Template com Exemplos (.xlsx)"**
2. Abra o arquivo em Excel
3. Veja os dados de exemplo (linhas 2, 3, 4)
4. Substitua pelos seus dados MANTENDO O FORMATO
5. Delete as linhas de exemplo
6. **Salve como CSV UTF-8** (essencial!)
   - Excel: `Arquivo → Salvar Como`
   - Tipo: `CSV (Separado por vírgula)`
   - Codificação: `UTF-8`
7. Faça upload

### **Opção B: Verificar Manualmente**

Abra seu arquivo em **Bloco de Notas** (não Excel!) e compare linha por linha:

```
EXEMPLO DE ARQUIVO CORRETO:
═══════════════════════════════════════════════════════════════════
CÓD,NOME FANTASIA,LATITUDE,LONGITUDE,TEMPO MÉDIO DE VISITA,FREQUÊNCIA,SEG (Dias do Vendedor),TER (Dias do Vendedor),QUA (Dias do Vendedor),QUI (Dias do Vendedor),SEX (Dias do Vendedor),SAB (Dias do Vendedor)
001,Loja Centro,-23.5505,-46.6333,01:00:00,2,X,,,,X,
002,Loja Zona Sul,-23.5886,-46.6536,00:45:00,3,,X,X,,X,
003,Loja Zona Norte,-23.4365,-46.4731,00:30:00,1,,,X,X,,
═══════════════════════════════════════════════════════════════════

Verificar:
✓ Linha 1: Exatamente os headers acima (com acentos corretos)
✓ Linhas 2+: Dados separados por vírgula (,)
✓ Coordenadas: Com PONTO decimal, não vírgula
✓ Frequência: Número inteiro (1-6)
✓ Tempo: Sempre HH:MM:SS
✓ Dias: Apenas X para vendedor visita, vazio para não visita
```

---

## 🧪 Testar Seu Arquivo ANTES de fazer Upload

Abra **Bloco de Notas** (ou VSCode) e verifique:

```
✅ Checklist:

[ ] HEADER está idêntico?
    CÓD,NOME FANTASIA,LATITUDE,LONGITUDE,TEMPO MÉDIO DE VISITA,FREQUÊNCIA,SEG (Dias do Vendedor),TER (Dias do Vendedor),QUA (Dias do Vendedor),QUI (Dias do Vendedor),SEX (Dias do Vendedor),SAB (Dias do Vendedor)

[ ] Cada linha tem 12 campos (separados por vírgulas)?

[ ] Todas as coordenadas têm PONTO (não vírgula)?
    Exemplo: -23.5505 (certo) ou -23,5505 (errado)?

[ ] Nenhuma coordenada é 0 ou vazia?

[ ] Frequência é número 1-6?

[ ] Tempo é HH:MM:SS (ex: 01:00:00)?

[ ] Arquivo está SALVO como CSV UTF-8?
```

---

## 💾 Salvando Corretamente em Excel

**Windows Excel:**
1. Abra seu arquivo
2. `Arquivo → Salvar Como`
3. Tipo de arquivo: `CSV (Separado por vírgula) (*.csv)`
4. Codificação: `UTF-8`
5. Salve

**Google Sheets:**
1. `Arquivo → Fazer download → CSV`
2. Pronto! Já sai em UTF-8

**LibreOffice:**
1. `Arquivo → Salvar Como`
2. Tipo: `CSV`
3. Codificação: `UTF-8`

---

## 📞 Ainda não funciona?

Se após seguir TODOS os passos acima o arquivo ainda for rejeitado:

1. **Copie as primeiras 3 linhas de seu arquivo** (1 header + 2 dados)
2. **Cole aqui na mensagem** para que possamos analisar exatamente
3. Vamos identificar qual campo está inválido

Exemplo do que compartilhar:
```
CÓD,NOME FANTASIA,LATITUDE,LONGITUDE,TEMPO MÉDIO DE VISITA,FREQUÊNCIA,SEG (Dias do Vendedor),TER (Dias do Vendedor),QUA (Dias do Vendedor),QUI (Dias do Vendedor),SEX (Dias do Vendedor),SAB (Dias do Vendedor)
001,Loja Centro,-23.5505,-46.6333,01:00:00,2,X,,,,X,
002,Loja Sul,-23.5886,-46.6536,00:45:00,3,,X,X,,X,
```

---

## 🔧 Melhorias Recentes

- ✅ Parser agora converte vírgula → ponto em coordenadas
- ✅ Mensagens de erro mais específicas (mostra qual campo falhou)
- ✅ Validação mais rigorosa de dados
- ✅ Suporte a ambos formatos: "SEG" e "SEG (Dias do Vendedor)"
