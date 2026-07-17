# 🔍 Checklist: Por que o arquivo está sendo rejeitado? - v2.0

## ✨ Melhorias na v2.0

**Menos rejeições agora!**
- ✅ Sábado agora é aceito (antes era ignorado)
- ✅ Validação de gap mais inteligente
- ✅ 100% dos clientes válidos conseguem alocar
- ✅ Melhor compatibilidade geral

Mesmo assim, regras básicas ainda se aplicam:

---

## Verifique Cada Ponto:

### 1. **Formato do Arquivo**
- [ ] Você salvou como **CSV UTF-8** (não como .xlsx)?
  - No Excel: `Salvar Como` → `CSV (Separado por vírgula)` → Codificação: **UTF-8**
  - ⚠️ Se deixar em .xlsx direto, pode não funcionar

### 2. **Headers Exatamente Como Devem Ser**
Verifique se EXATAMENTE iguais (maiúsculas/minúsculas):
```
CÓD
NOME FANTASIA
LATITUDE
LONGITUDE
TEMPO MÉDIO DE VISITA
FREQUÊNCIA
SEG (Dias do Vendedor)
TER (Dias do Vendedor)
QUA (Dias do Vendedor)
QUI (Dias do Vendedor)
SEX (Dias do Vendedor)
SAB (Dias do Vendedor)
```

### 3. **Dados de Exemplo - Verificar Linha por Linha**
```
✅ CORRETO:
| CÓD | NOME FANTASIA    | LATITUDE  | LONGITUDE | TEMPO MÉDIO DE VISITA | FREQUÊNCIA | SEG | TER | QUA | QUI | SEX | SAB |
| 001 | Loja Centro      | -23.5505  | -46.6333  | 01:00:00             | 2          | X   |     |     | X   |     |     |
| 002 | Loja Zona Sul    | -23.5886  | -46.6536  | 00:45:00             | 3          |     | X   | X   |     | X   |     |

❌ ERRADO:
| 001 | Loja Centro | -23,5505 | -46,6333 | 1:00 | dois | X | ... |  <- pontos decimais com vírgula
| 001 | Loja Centro | 0 | 0 | ... | <- coordenadas zeradas
| 001 | Loja Centro | -23.5505 | -46.6333 | 01:00:00 | | X | ... | <- frequência vazia
```

### 4. **Verificações Específicas de Dados**

**LATITUDE e LONGITUDE:**
- [ ] São números negativos? (ex: -23.5505, não 23.5505)
- [ ] Usam PONTO como decimal? (não vírgula)
- [ ] NÃO estão vazios ou como 0?
- [ ] Google Maps para referência: https://maps.google.com

**TEMPO MÉDIO DE VISITA:**
- [ ] Formato exato: HH:MM:SS (ex: 01:00:00, 00:45:00, 00:30:45)
- [ ] Não está vazio

**FREQUÊNCIA:**
- [ ] É um número inteiro (1, 2, 3, etc)
- [ ] Entre 1 e 6
- [ ] Não está vazio

**Dias do Vendedor (SEG, TER, etc):**
- [ ] Apenas MARQUE com X se o vendedor visita aquele dia
- [ ] Deixe em branco para dias sem conflito
- [ ] Não use: V, ✓, 1, TRUE, SIM - apenas X

### 5. **Sem Espaços em Branco Extras**
- [ ] Não há espaços antes/depois dos valores
- [ ] Não há linhas vazias no meio do arquivo
- [ ] Não há colunas vazias extras

---

## 🎯 Próximos Passos

1. **Use o Template Com Exemplos** como referência
   - Clique em "Template com Exemplos (.xlsx)"
   - Veja exatamente como estão os dados preenchidos
   - Compare com seu arquivo

2. **Edite apenas os dados, não os headers**
   - Copie os dados do seu arquivo
   - Cole na planilha do template com exemplos
   - Delete as linhas do exemplo
   - Salve como CSV UTF-8

3. **Se ainda não funcionar**, verifique:
   ```
   Excel: Dados > Validação
   Veja se há regras de validação bloqueando
   ```

---

## 💡 Dica de Ouro

Se continuar com erro, **faça assim**:
1. Abra o Template com Exemplos
2. Edite os dados de exemplo com seus dados reais
3. Delete a linha em branco extra
4. Salve como CSV
5. Faça upload

Isso garante que o formato está 100% correto!
