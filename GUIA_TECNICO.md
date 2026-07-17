# 📍 GUIA TÉCNICO - Otimizador de Rotas de Vendas

**Versão**: 4.1 ✨ Ajustes de Gap Implementados
**Data**: 2026-07-08  
**Status**: ✅ Produção | **Taxa Alocação**: 100% (81/81) | **Utilização**: 73.24%

### Últimas Mudanças v4.1
1. Gap threshold: `frequency < 3` → `frequency < 4` (freq 3 agora com gap obrigatório)
2. CSV fix: Inversão de lógica - X = bloqueado (não disponível)
3. Resultado: 100% compliance com 0 inconsistências de dados
4. Performance: Build 0 erros TypeScript, 201 kB First Load JS

**Detalhes**: [NOVIDADES.md](NOVIDADES.md), [ALGORITMO.md](ALGORITMO.md)

---

## 🎯 O que é?

Aplicação Next.js que otimiza rotas de vendedores/promotores respeitando:
- 📍 Geolocalização (agrupa clientes próximos)
- 📅 Frequência de visitas (2x/semana, 3x/semana, etc)
- 🗓️ Disponibilidade (dias abertos/fechados)
- ⏱️ Capacidade de tempo (8h/dia útil, 4h/sábado)

---

## 🚀 Quick Start (5 minutos)

### 1. Iniciar
```bash
cd "f:\Otimizador de Rotas"
npm run dev
# Acessa http://localhost:3001
```

### 2. Baixar Template
- Clique em "Template com Exemplos (.xlsx)"
- Abre um Excel com dados de exemplo

### 3. Preparar CSV
Precisa ter estas colunas:
- `CÓD` → ID único
- `NOME FANTASIA` → Nome do cliente
- `LATITUDE` e `LONGITUDE` → Coordenadas
- `TEMPO MÉDIO DE VISITA` → Duração (HH:MM:SS)
- `FREQUÊNCIA` → 1, 2, 3... (vezes por semana)
- `ROTAS` → Nome da rota/vendedor

Opcional: `SEG, TER, QUA, QUI, SEX, SAB` com X = disponível

### 4. Upload
- Arraste ou clique em "Choose File"
- Selecione seu CSV/XLSX

### 5. Gerar
- Clique "Gerar Roteirização Otimizada"
- Vê o dashboard com resultado

### 6. Exportar
- Clique "Exportar para Excel"
- Salva `Rotas_Otimizadas_[DATA].xlsx`

---

## 📊 Exemplo de Dados de Entrada

**CSV com separador VÍRGULA:**

```csv
CÓD,NOME FANTASIA,LATITUDE,LONGITUDE,TEMPO MÉDIO DE VISITA,FREQUÊNCIA,ROTAS,SEG,TER,QUA,QUI,SEX,SAB
151,COMPREMAX - MISTER HULL,-3.7392121,-38.5924565,02:54:20,2,ROTA 1,X,,X,,,
11455,SUPER BENFICA - BENFICA,-3.7451759,-38.5402234,01:08:40,2,ROTA 1,X,,,X,,
3968,LAREDO - CENTRO,-3.7309369,-38.5376384,00:49:06,2,ROTA 1,X,,X,,,
```

**CSV com separador PONTO-E-VÍRGULA (precisa converter para vírgula):**

```csv
CÓD;NOME FANTASIA;LATITUDE;LONGITUDE;...
151;COMPREMAX - MISTER HULL;-3.7392121;-38.5924565;...
```

---

## 📤 Exemplo de Dados de Saída

Excel com colunas:
- CÓD
- NOME FANTASIA  
- ROTA (gerada automaticamente)
- FREQUÊNCIA
- TEMPO MÉDIO DE VISITA
- **SEG, TER, QUA, QUI, SEX, SAB** (X = dia alocado)

Resultado:
```
151 | COMPREMAX - MISTER HULL | ROTA 1 | 2 | 02:54:20 | X | | | X | |
```

---

## 🧮 Como Funciona (Algoritmo)

### Passo 1️⃣: Parse CSV
- Lê arquivo CSV/Excel
- Valida campos obrigatórios
- Converte tempo em minutos
- Cria lista de `Client[]`

### Passo 2️⃣: Matriz de Distâncias
- Calcula distância entre TODOS os pares de clientes (Haversine)
- Armazena em Map<clientId, Map<clientId, distance>>

### Passo 3️⃣: Expandir por Frequência
- Cliente freq=3 → 3 visitações independentes
- Cada uma herda os dias disponíveis

### Passo 4️⃣: Alocar aos Dias
Para cada visitação:
1. Calcular dias válidos = (SEG/TER/...com X) ∩ ¬(dias bloqueados)
2. Encontrar dia com capacidade + próximo disponível
3. Alocar se couber em tempo
4. Se não caber, avisar "visita não alocada"

### Passo 5️⃣: Otimizar Sequência
Por dia, ordenar clientes por **Nearest Neighbor (TSP)**
- Começa no cliente mais central
- Sempre vai pro vizinho mais próximo
- Minimiza distância total

### Passo 6️⃣: Gerar Rotas
- Calcular tempos de deslocamento
- Definir horários (chegada/saída)
- Exportar como Excel

---

## 🗂️ Arquivos Principais

### `/utils/csvParser.ts` (~200 linhas)
```typescript
Responsável por:
- Ler CSV/Excel
- Validar dados
- Criar objetos Client[]
- Reconhecer colunas (mesmo com nomes variados)
```

### `/utils/scheduleGenerator.ts` (~1000 linhas)
```typescript
Responsável por:
- Algoritmo CSP (6 passos)
- Alocação de visitações
- Validação de restrições
- Geração de rotas finais
```

### `/utils/distanceUtils.ts` (~130 linhas)
```typescript
Responsável por:
- Cálculo Haversine (distância)
- Matriz de distâncias
- Algoritmo Nearest Neighbor (TSP)
- Estimativa de tempo de viagem
```

### `/app/page.tsx` (UI Principal)
```typescript
Responsável por:
- Tela de upload
- Configuração de capacidades
- Dashboard de resultados
- Export XLSX
```

---

## 🎯 Interfaces TypeScript

### Client
```typescript
interface Client {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  visitDurationMinutes: number;
  frequency: number;
  promoterId: string;
  visitorDays: {
    monday: boolean;    // true = disponível
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
  };
}
```

### WorkSchedule
```typescript
interface WorkSchedule {
  monday: number;       // horas
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
}
```

### DailyRoute
```typescript
interface DailyRoute {
  day: string;                      // "Segunda"
  promoterId: string;               // "ROTA 1"
  stops: RouteStop[];               // lista de clientes
  totalTravelTimeMinutes: number;   // tempo de deslocamento
  totalVisitTimeMinutes: number;    // tempo de visita
  totalTimeMinutes: number;         // total
  routeNumber: number;              // 1, 2, 3...
}
```

### RouteStop
```typescript
interface RouteStop {
  order: number;                    // 1, 2, 3...
  clientId: string;
  clientName: string;
  latitude: number;
  longitude: number;
  visitDurationMinutes: number;
  travelTimeMinutes: number;        // tempo pra chegar
  arrivalTime: string;              // "08:00"
  departureTime: string;            // "10:54"
  frequency: number;                // frequência original
  visitorDays: object;              // dias disponíveis
}
```

---

## 📐 Fórmulas Matemáticas

### Distância Haversine (km)
```
a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
c = 2 ⋅ atan2( √a, √(1−a) )
d = R ⋅ c

R = 6.371 km (raio da Terra)
φ = latitude (radianos)
λ = longitude (radianos)
```

### Tempo de Deslocamento (minutos)
```
velocidade_média = 40 km/h (padrão Fortaleza)
tempo = (distância_km ÷ 40) × 60 minutos
```

### Utilização (%)
```
utilização = (tempo_usado ÷ capacidade_diária) × 100
```

---

## 🔐 Restrições (Hard Constraints)

Nunca são violadas:

1. **Capacidade Diária**
   - Seg-Sex: 480 min (8h)
   - Sáb: 240 min (4h)
   - Não cabe mais? Avisa

2. **Frequência**
   - Cliente freq=3 DEVE ter 3 visitas
   - Se não cabe, avisa

3. **Disponibilidade**
   - Só aloca em dias com X
   - Se marcado SEG+QUI, NUNCA marca terça

4. **Unicidade**
   - Mesmo cliente, máximo 1 visita/dia
   - Não pode visitar 2x na segunda

---

## 🐛 Erros Comuns

### ❌ "Arquivo não reconhecido"
**Causa**: Separador errado (ponto-e-vírgula vs vírgula)  
**Solução**: Abra em Excel → Arquivo → Salvar como → CSV UTF-8 (delimitado por vírgula)

### ❌ "Gerar" está desabilitado
**Causa**: Nenhum arquivo foi carregado  
**Solução**: Faça upload antes

### ❌ Clientes aparecem mas são 0%
**Causa**: Coordenadas (lat/long) inválidas ou faltando  
**Solução**: Verifique planilha, latitude e longitude devem ter valores numéricos

### ❌ Muitos avisos "X visitas não alocadas"
**Causa**: Capacidade insuficiente ou dias muito restritos  
**Solução**:
- Aumentar horas disponíveis (WorkSchedule)
- Reduzir frequência dos clientes
- Distribuir em mais rotas/vendedores

---

## ⚙️ Configurações

### Jornada de Trabalho (padrão)
- Segunda: 8h = 480 min
- Terça: 8h = 480 min
- Quarta: 8h = 480 min
- Quinta: 8h = 480 min
- Sexta: 8h = 480 min
- Sábado: 4h = 240 min

Pode editar na UI antes de gerar

### Velocidade Média
- Padrão: 40 km/h
- Código: `utils/distanceUtils.ts:8`
- Editar se necessário

---

## 📊 Métricas Úteis

Aparecem no Dashboard após gerar:

```
📊 RESULTADOS
├── Total de Clientes: 81
├── Utilização Média: 95.68%
├── Número de Rotas: 6
├── ⚠️ Avisos: 30 (clientes com visitas parciais)
└── Tempo: 2.5s (processamento)
```

**Boa utilização**: 75-85% (>85% = muito apertado, <75% = capacidade ociosa)

---

## 🚀 Deploy (Futuro)

Para colocar em produção (Vercel, etc):

```bash
npm run build
npm run start
```

Ou fazer deploy automático via GitHub.

---

## 📞 Suporte

**Dúvida**: Formato do CSV?  
**Resposta**: Baixe o template, preencha, salve como CSV

**Dúvida**: Muitas rotas?  
**Resposta**: Aumentar capacidade (8h → 10h) ou reduzir frequência

**Dúvida**: Resultado muito ruim?  
**Resposta**: Verifique coordenadas (lat/long) dos clientes

---

## 📈 Roadmap

- [ ] Integração Google Maps (rota visual)
- [ ] Multi-cidades
- [ ] Histórico de rotas
- [ ] App móvel (React Native)
- [ ] Relatórios em PDF
- [ ] Sincronização em tempo real
- [ ] Previsão de demanda

---

**Desenvolvido com ♥ para otimizar vendas**
