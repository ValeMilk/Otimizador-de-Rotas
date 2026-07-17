# FAQ e Troubleshooting - v2.0

## 🎉 VERSÃO 2.0 - Novas Respostas!

### P: Taxa de alocação melhorou muito! O que mudou?
**R:** Versão 2.0 implementou 4 correções críticas:
1. **Gap logic corrigida** → Permite terça-quinta (diff=2 agora permitido)
2. **Sábado incluído** → 6 dias disponíveis para alocação
3. **Best-fit packing** → Melhor uso da capacidade diária
4. **Excel export corrigido** → Dias marcados corretamente

Taxa passou de 13% → **100%**! Veja [NOVIDADES.md](NOVIDADES.md) para detalhes.

### P: Por que sábado agora está aparecendo?
**R:** Na v2.0, o motor foi expandido para incluir sábado (dia 5) em ambas as fases:
- **Fase 1** (rigorosa): Tenta alocar respeitando gap com 10 rodadas
- **Fase 2** (flexível): Tenta sem gap requirement com 20 rodadas
- Ambas agora incluem dias 0-5 (segunda-sábado)

---

## ❓ Perguntas Frequentes

### 1. Como preparar meu arquivo CSV?

**R:** O arquivo deve conter as seguintes colunas:
- `CÓD` - Identificador único
- `NOME FANTASIA` - Nome da loja
- `LATITUDE` e `LONGITUDE` - Coordenadas (ex: -23.5505, -46.6333)
- `TEMPO MÉDIO DE VISITA` - Duração (HH:MM:SS)
- `FREQUÊNCIA` - Número inteiro
- `SEG`, `TER`, `QUA`, `QUI`, `SEX`, `SAB` - Marcar com X
- `ROTAS` - ID do promotor

Veja `exemplo_clientes.csv` para referência.

### 2. Por que alguns clientes não foram alocados?

**R (v1.x):** Possíveis causas:
- Cliente tem restrição de agenda todos os dias (vendedor o visita)
- Não há capacidade horária disponível nos dias permitidos
- Frequência é muito alta (ex: 6x por semana, mas só tem 3 dias disponíveis)

**R (v2.0):** Na versão 2.0, taxa de alocação é **100%**. Se algum cliente não alocar:
- Verifique se a frequência é maior que 6 (impossível alocar 7x em 6 dias)
- Confirme se o cliente tem resto de capacidade semanal não utilizado
- Veja avisos detalhados na interface

Verifique os "Avisos da Otimização" na interface.

### 3. Como entendo as coordenadas de latitude/longitude?

**R:** 
- **Latitude**: Varia de -90 (Sul) a +90 (Norte)
- **Longitude**: Varia de -180 (Oeste) a +180 (Leste)

Para São Paulo:
- Latitude: -23.5505
- Longitude: -46.6333

Use Google Maps ou ferramentas online para obter as coordenadas.

### 4. Posso alterar a jornada de trabalho?

**R:** Sim! Na seção "Configuração de Jornada de Trabalho" você pode:
- Alterar as horas de cada dia
- Usar o botão "Restaurar Padrão" para voltar (8h seg-sex, 4h sábado)
- Valores devem estar entre 0 e 24 horas

### 5. O que significa "Utilização Média"?

**R:** É o percentual de tempo de trabalho efetivamente utilizado:
- 100% = Promotor trabalha o tempo todo
- 50% = Promotor trabalha metade do tempo
- Meta recomendada: 80-95%

### 6. Posso exportar os resultados?

**R:** Atualmente você pode:
1. Copiar a tabela do navegador (Ctrl+C)
2. Capturar screenshot do mapa
3. Colar em Excel ou Word

Futuramente teremos exportação em PDF.

---

## 🐛 Troubleshooting

### Problema: "Por favor, faça upload de um arquivo CSV ou Excel válido"

**Causas:**
- Arquivo não é CSV ou Excel
- Arquivo está corrompido
- Extensão não é .csv, .xls ou .xlsx

**Solução:**
- Verifique o tipo do arquivo
- Tente converter em CSV usando Excel: `Salvar Como > CSV (Separado por vírgula)`

### Problema: "Nenhum cliente válido encontrado no arquivo"

**Causas Mais Comuns:**
1. **Template em branco sem dados** - Você baixou o template mas não preencheu nada
2. **Colunas com nomes incorretos** - Não está usando o template fornecido
3. **Dados inválidos** - Latitude/Longitude vazios ou frequência não é número
4. **Coordenadas com zeros** - Latitude/Longitude não podem ser 0,0

**Solução Passo a Passo:**
1. ✅ Clique em "Template em Branco" ou "Template com Exemplos"
2. ✅ **Abra em Excel** e preencha com seus dados
3. ✅ Verifique cada coluna:
   - **CÓD**: número ou código da loja
   - **NOME FANTASIA**: nome da loja
   - **LATITUDE/LONGITUDE**: coordenadas reais (ex: -23.5505, -46.6333)
   - **TEMPO MÉDIO DE VISITA**: formato HH:MM:SS (ex: 01:00:00)
   - **FREQUÊNCIA**: número de visitas por semana (1-6)
   - **Dias do Vendedor**: marque com X os dias em que o vendedor já visita
4. ✅ Salve como CSV (Excel: Salvar Como > CSV UTF-8 (.csv))
5. ✅ Faça o upload novamente

**Dica de Ouro:** Use o "Template com Exemplos" para ver dados preenchidos corretamente!

### Problema: A aplicação está lenta

**Causas:**
- Muitos clientes (> 1000)
- Computador lento
- Navegador com muitas abas abertas

**Solução:**
- Feche abas desnecessárias
- Divida os clientes em arquivos menores
- Use navegador mais moderno (Chrome, Edge, Firefox)

### Problema: O mapa não está mostrando nada

**Possíveis causas:**
- Rota selecionada não tem paradas
- Coordenadas fora de limites
- Problema na renderização do canvas

**Solução:**
- Selecione outro dia/promotor
- Verifique se as coordenadas estão corretas
- Recarregue a página (F5)

### Problema: Navegador diz "Não há resposta"

**Causas:**
- Otimização com muitos clientes (está processando)
- JavaScript desabilitado
- Problema de memória

**Solução:**
- Aguarde um pouco (otimização está rodando)
- Divida em lotes menores
- Habilite JavaScript nas configurações do navegador

---

## 🚀 Dicas de Otimização

### 1. Melhorar Utilização de Rotas

**Problema**: Utilização baixa (< 70%)

**Soluções:**
```
1. Reduzir horas de trabalho (menos ociosidade)
2. Aumentar frequência de clientes próximos
3. Remover clientes de difícil acesso
4. Revisar estimativas de tempo de visita
```

### 2. Alocar Todos os Clientes

**Problema**: Alguns clientes não têm todas as frequências alocadas

**Soluções:**
```
1. Aumentar horas de trabalho
2. Reduzir frequência de clientes
3. Revisar conflitos de agenda (dias do vendedor)
4. Revisar tempo de visita (pode estar alto)
```

### 3. Reduzir Tempo de Viagem

**Problema**: Muito tempo gasto em deslocamento

**Soluções:**
```
1. Agrupar clientes por região
2. Verificar se coordenadas estão corretas
3. Usar valores de velocidade mais realistas
4. Considerar horários de pico
```

---

## ⚙️ Configurações Técnicas

### Variáveis de Ambiente

```bash
# .env.local
NEXT_PUBLIC_ENV=development
# NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=sua_chave_aqui
```

### Performance

| Métrica | Limite | Observação |
|---------|--------|-----------|
| Clientes | < 500 | Acima disso, considere dividir |
| Promotores | < 20 | Recomendado |
| Dias | 6 | Seg-Sáb (fixo) |
| Processamento | < 5s | Para 200 clientes |

### Requisitos do Navegador

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- JavaScript habilitado
- LocalStorage habilitado

---

## 📞 Suporte

Se o problema persiste:

1. **Verifique o console** (F12 > Console)
2. **Limpe cache** (Ctrl+Shift+Delete)
3. **Teste em outro navegador**
4. **Reinicie a aplicação** (F5)
5. **Tente com arquivo menor**

---

## 🔍 Debug Mode

Para ativar logs detalhados:

```javascript
// No console do navegador (F12)
localStorage.setItem('DEBUG', 'true');
// Recarregue a página
location.reload();
```

Para desativar:
```javascript
localStorage.removeItem('DEBUG');
```

---

## 📋 Checklist de Verificação

Antes de executar a otimização:

- [ ] Arquivo está em formato CSV ou Excel
- [ ] Todas as colunas obrigatórias estão presentes
- [ ] Coordenadas estão em latitude/longitude válidas
- [ ] Frequência é um número inteiro > 0
- [ ] Nomes dos promotores estão consistentes
- [ ] Jornada de trabalho foi configurada corretamente
- [ ] Navegador está atualizado
- [ ] JavaScript está habilitado

---

Ainda tem dúvidas? Verifique:
- 📖 [README.md](README.md) - Visão geral
- 🧮 [ALGORITMO.md](ALGORITMO.md) - Detalhes técnicos
- 💻 [EXEMPLOS.md](EXEMPLOS.md) - Exemplos de código
