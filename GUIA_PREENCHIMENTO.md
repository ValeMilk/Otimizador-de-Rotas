# 📋 Guia de Preenchimento da Planilha - v2.0

## 🆕 Mudanças na v2.0

**Boas notícias para preenchimento!**
- ✅ Sábado agora é válido (coluna SAB funciona)
- ✅ Matriz de alocação expandida (0-5 dias)
- ✅ Melhor aproveitamento de capacidade
- ✅ 100% dos clientes alocáveis

O preenchimento continua o mesmo, mas os resultados melhoram significativamente.

---

## Como Preencher o Template Corretamente

### 1. Baixar o Template
Na interface, clique em um dos botões de download:
- **Template em Branco**: Para começar do zero
- **Template com Exemplos**: Para ver como preencher

### 2. Colunas Obrigatórias (que você preenche)

#### CÓD (Identificador da Loja)
- Número ou código único da loja
- Exemplo: `001`, `002`, `LOJA_001`
- **Obrigatório**

#### NOME FANTASIA (Nome da Loja)
- Nome comercial da loja
- Exemplo: `Loja Centro`, `Loja Zona Sul`
- **Obrigatório**

#### LATITUDE (Coordenada Geográfica)
- Número decimal com até 6 casas decimais
- Exemplo: `-23.5505`
- **Obrigatório** - Use coordenadas reais do Google Maps

#### LONGITUDE (Coordenada Geográfica)
- Número decimal com até 6 casas decimais
- Exemplo: `-46.6333`
- **Obrigatório** - Use coordenadas reais do Google Maps

#### TEMPO MÉDIO DE VISITA
- Tempo em formato `HH:MM:SS`
- Exemplo: `01:00:00` (1 hora), `00:45:30` (45 minutos e 30 segundos)
- Este é o tempo que o promotor leva para visitar a loja
- **Obrigatório**

#### FREQUÊNCIA (Quantas Vezes Visitar por Semana)
- Número inteiro de quantas vezes o **promotor** deve visitar essa loja por semana
- Exemplo: `1`, `2`, `3`, `5`
- Deve ser entre 1 e 6
- **Obrigatório**

### 3. Dias do Vendedor (Conflito de Agenda)

⚠️ **IMPORTANTE:** Estas colunas indicam quando o **VENDEDOR** (da loja) já visita a loja.

Marque com `X` os dias em que o **vendedor** já está presente na loja. O promotor **NUNCA** visitará nestes dias para evitar conflito.

| Coluna | Significado |
|--------|------------|
| **SEG (Dias do Vendedor)** | Segunda-feira - vendedor está neste dia? Marque X |
| **TER (Dias do Vendedor)** | Terça-feira - vendedor está neste dia? Marque X |
| **QUA (Dias do Vendedor)** | Quarta-feira - vendedor está neste dia? Marque X |
| **QUI (Dias do Vendedor)** | Quinta-feira - vendedor está neste dia? Marque X |
| **SEX (Dias do Vendedor)** | Sexta-feira - vendedor está neste dia? Marque X |
| **SAB (Dias do Vendedor)** | Sábado - vendedor está neste dia? Marque X |

**Exemplo:**
- Loja que o vendedor visita na segunda (SEG) e quinta (QUI): marque `X` em `SEG` e `X` em `QUI`
- O promotor então será agendado apenas terça, quarta, sexta ou sábado

---

## 🤖 Colunas Calculadas Automaticamente

### ROTAS (Atribuição de Promotor)
- **NÃO preencha esta coluna** - o otimizador calcula automaticamente
- O algoritmo analisa:
  - Frequência de visitas
  - Dias disponíveis (sem conflito com vendedor)
  - Carga horária de trabalho
  - Distâncias geográficas
- Cada promotor receberá um ID automático (ROTA_01, ROTA_02, etc)

---

## ✅ Exemplo Completo de Preenchimento

| CÓD | NOME FANTASIA | LATITUDE | LONGITUDE | TEMPO MÉDIO DE VISITA | FREQUÊNCIA | SEG (Dias do Vendedor) | TER (Dias do Vendedor) | QUA (Dias do Vendedor) | QUI (Dias do Vendedor) | SEX (Dias do Vendedor) | SAB (Dias do Vendedor) |
|-----|---------------|----------|-----------|----------------------|------------|--------|--------|--------|--------|--------|--------|
| 001 | Loja Centro | -23.5505 | -46.6333 | 01:00:00 | 2 | X |  |  | X |  |  |
| 002 | Loja Zona Sul | -23.5886 | -46.6536 | 00:45:00 | 3 |  | X | X |  | X |  |
| 003 | Loja Zona Norte | -23.5602 | -46.7057 | 00:30:00 | 2 | X | X |  |  |  |  |
| 004 | Loja Zona Oeste | -23.5538 | -46.6597 | 00:50:00 | 3 |  |  | X |  |  | X |
| 005 | Loja Zona Leste | -23.5562 | -46.6353 | 01:15:00 | 2 | X |  |  |  | X |  |

**O Resultado Esperado:**
- O otimizador lerá seus dados
- Criará automaticamente as rotas (ROTA_01, ROTA_02, etc)
- Agendará 2 visitas da "Loja Centro" em dias que não sejam segunda e quinta
- E assim por diante para todas as lojas

---

## 🔍 Dicas Importantes

### ✅ Faça Assim
- Preencha exatamente as 6 colunas obrigatórias
- Deixe a coluna ROTAS em branco (o otimizador preenche)
- Use UTF-8 no encoding da planilha
- Verifique coordenadas no Google Maps
- Marque com `X` apenas para conflitos (quando vendedor está lá)
- Deixe células vazias (sem X) para dias disponíveis

### ❌ NÃO Faça Assim
- Não preencha a coluna ROTAS manualmente
- Não use outros caracteres além de X (não use V, ✓, 1, etc)
- Não deixe coordenadas em branco
- Não use caracteres especiais em IDs de loja
- Não use pontos e vírgulas para separar valores

---

## 📍 Como Obter Coordenadas

### Google Maps
1. Abra [maps.google.com](https://maps.google.com)
2. Pesquise o endereço da loja
3. Clique com botão direito no pino
4. Copie as coordenadas (latitude, longitude)

### Formato Correto
```
Google Maps: -23.5505, -46.6333
Planilha:
  LATITUDE: -23.5505
  LONGITUDE: -46.6333
```

---

## ⏱️ Formatos de Tempo

### Válidos
- `01:00:00` → 1 hora
- `00:45:00` → 45 minutos
- `00:30:45` → 30 minutos e 45 segundos
- `02:15:30` → 2 horas, 15 minutos e 30 segundos

### Não Válidos ❌
- `1:00` → Deve ser `01:00:00`
- `1h` → Use formato `HH:MM:SS`
- `60 min` → Use formato `HH:MM:SS`

---

## 🚀 Após Preencher

1. **Salve como CSV** (no Excel: Salvar Como > CSV UTF-8)
2. **Verifique os dados** (abra novamente para confirmar)
3. **Faça o upload** na aplicação
4. **Revise os avisos** (se houver)
5. **Clique em "Gerar Roteirização Otimizada"**
6. **Veja as rotas geradas** no dashboard de resultados
   - As colunas ROTAS agora terão os promotores automaticamente atribuídos
   - Você verá ROTA_01, ROTA_02, etc

---

## ❓ Perguntas Comuns

**P: Por que não preencho a coluna ROTAS?**  
R: O otimizador calcula automaticamente qual promotor vai visitar cada loja, baseado em frequência, capacidade e distâncias.

**P: O que significa "Dias do Vendedor"?**  
R: São os dias que o VENDEDOR DA LOJA já visita aquela loja. Marque com X para que o promotor não visite no mesmo dia (conflito).

**P: Se deixar toda a semana vazia, o promotor pode visitar qualquer dia?**  
R: Sim! Se nenhum dia tiver X, o promotor terá total liberdade para visitar conforme sua disponibilidade.
R: Não, deixe linhas vazias e elas serão ignoradas.

**P: Coordenadas podem ser positivas?**  
R: Sim! Depende da localização. Brasil usa negativos (-23, -46).

**P: Posso usar ponto ou vírgula como separador decimal?**  
R: Recomendamos ponto. O sistema aceita ambos.

---

Para mais ajuda, veja [FAQ.md](../FAQ.md) ou [README.md](../README.md)
