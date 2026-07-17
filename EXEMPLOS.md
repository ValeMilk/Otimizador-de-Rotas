# Exemplos de Uso - v2.0

## 🚀 VERSÃO 2.0 - Motor Reescrito!

**Mudanças importantes:**
- ✅ Taxa de alocação: 100% (vs 13% antes)
- ✅ Sábado agora operacional
- ✅ Capacidade diária otimizada
- ✅ Excel export corrigido

Veja [NOVIDADES.md](NOVIDADES.md) para detalhes técnicos.

---

## 1. Importar Dados de Clientes

### Usando o Componente FileUpload
```tsx
import { FileUpload } from '@/components';
import { Client } from '@/types';

export const MyComponent = () => {
  const handleFilesLoaded = (clients: Client[]) => {
    console.log(`${clients.length} clientes carregados`);
  };

  return <FileUpload onFilesLoaded={handleFilesLoaded} />;
};
```

### Importar Arquivo Diretamente
```tsx
import { importClientDataFromFile } from '@/utils';

const file = new File(
  ['CÓD,NOME FANTASIA,LATITUDE,LONGITUDE...'],
  'clientes.csv',
  { type: 'text/csv' }
);

const clients = await importClientDataFromFile(file);
```

## 2. Calcular Distâncias

### Distância Haversine
```tsx
import { calculateHaversineDistance } from '@/utils';

const dist = calculateHaversineDistance(-23.5505, -46.6333, -23.5886, -46.6536);
console.log(`Distância: ${dist.toFixed(2)} km`);
```

### Matriz de Distâncias
```tsx
import { calculateDistanceMatrix } from '@/utils';

const clients = [
  { id: '1', latitude: -23.5505, longitude: -46.6333 },
  { id: '2', latitude: -23.5886, longitude: -46.6536 },
];

const matrix = calculateDistanceMatrix(clients);
const dist12 = matrix.get('1')?.get('2'); // km
```

### Nearest Neighbor
```tsx
import { nearestNeighbor } from '@/utils';

const clientIds = ['1', '2', '3', '4', '5'];
const matrix = calculateDistanceMatrix(clients);

const optimizedOrder = nearestNeighbor(clientIds, matrix);
// Resultado: ['1', '3', '2', '5', '4'] por exemplo
```

## 3. Manipulação de Tempo

### Converter Tempo
```tsx
import { 
  timeStringToMinutes, 
  minutesToTimeString,
  hoursToMinutes,
  formatMinutesForDisplay
} from '@/utils';

// String para minutos
const mins1 = timeStringToMinutes('01:30:45'); // 91 minutos

// Minutos para string
const str = minutesToTimeString(91); // "01:30:45"

// Horas para minutos
const mins2 = hoursToMinutes(8); // 480 minutos

// Formato para exibição
const display = formatMinutesForDisplay(480); // "8h 0m"
```

## 4. Otimizar Rotas

### Usando o Hook
```tsx
import { useRouteOptimization } from '@/hooks';
import { Client, WorkSchedule } from '@/types';

export const OptimizationComponent = () => {
  const { result, isLoading, error, optimize } = useRouteOptimization();

  const handleOptimize = async () => {
    const clients: Client[] = [...];
    const schedule: WorkSchedule = {
      monday: 8,
      tuesday: 8,
      // ...
    };

    await optimize(clients, schedule);
  };

  return (
    <div>
      <button onClick={handleOptimize} disabled={isLoading}>
        Otimizar
      </button>

      {error && <p>Erro: {error}</p>}
      {result && <DisplayResult result={result} />}
    </div>
  );
};
```

### Direto da Engine
```tsx
import { optimizeRoutes } from '@/utils';

const clients: Client[] = [...];
const schedule: WorkSchedule = {
  monday: 8,
  tuesday: 8,
  wednesday: 8,
  thursday: 8,
  friday: 8,
  saturday: 4,
};

const result = optimizeRoutes(clients, schedule);

console.log(`Rotas otimizadas: ${result.routes.length}`);
console.log(`Utilização: ${result.summary.averageUtilization}%`);
console.log(`Avisos: ${result.summary.warnings.length}`);
```

## 5. Filtrar e Exibir Rotas

### Obter Rota Específica
```tsx
import { DailyRoute, OptimizationResult } from '@/types';

const getRoute = (
  result: OptimizationResult,
  promoterId: string,
  day: string
): DailyRoute | undefined => {
  return result.routes.find(r => 
    r.promoterId === promoterId && r.day === day
  );
};

const route = getRoute(result, 'ROTA_01', 'monday');
```

### Listar Promotores
```tsx
const getPromoters = (result: OptimizationResult): string[] => {
  return [...new Set(result.routes.map(r => r.promoterId))];
};

const promoters = getPromoters(result); // ['ROTA_01', 'ROTA_02', ...]
```

## 6. Validar Dados

### Validar Cliente
```tsx
const isValidClient = (client: Client): boolean => {
  return (
    client.id.length > 0 &&
    client.name.length > 0 &&
    client.latitude >= -90 && client.latitude <= 90 &&
    client.longitude >= -180 && client.longitude <= 180 &&
    client.visitDurationMinutes > 0 &&
    client.frequency > 0
  );
};
```

## 7. Exportar/Imprimir Resultados

### Estrutura JSON
```tsx
const exportAsJson = (result: OptimizationResult) => {
  const json = JSON.stringify(result, null, 2);
  downloadFile(json, 'rotas.json', 'application/json');
};
```

### CSV Simples
```tsx
const exportAsCsv = (result: OptimizationResult) => {
  let csv = 'Dia,Promotor,Ordem,Cliente,Chegada,Saída,Visitação,Deslocamento\n';
  
  for (const route of result.routes) {
    for (const stop of route.stops) {
      csv += `${route.day},${route.promoterId},${stop.order},${stop.clientName},${stop.arrivalTime},${stop.departureTime},${stop.visitDurationMinutes},${stop.travelTimeMinutes}\n`;
    }
  }
  
  downloadFile(csv, 'rotas.csv', 'text/csv');
};
```

## 8. Integração com Componentes

### Componente Customizado
```tsx
'use client';

import { useState } from 'react';
import { FileUpload, WorkScheduleConfig, ResultsDashboard, LoadingSpinner } from '@/components';
import { useRouteOptimization } from '@/hooks';
import { Client, WorkSchedule } from '@/types';

export const RouteOptimizer = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [schedule, setSchedule] = useState<WorkSchedule>({
    monday: 8,
    tuesday: 8,
    wednesday: 8,
    thursday: 8,
    friday: 8,
    saturday: 4,
  });

  const { result, isLoading, optimize } = useRouteOptimization();

  const handleOptimize = () => optimize(clients, schedule);

  return (
    <div className="space-y-6">
      <FileUpload onFilesLoaded={setClients} />
      <WorkScheduleConfig onScheduleChange={setSchedule} isLoading={isLoading} />
      <button onClick={handleOptimize} disabled={isLoading || clients.length === 0}>
        {isLoading ? 'Otimizando...' : 'Gerar Rotas'}
      </button>
      {isLoading && <LoadingSpinner />}
      {result && <ResultsDashboard result={result} />}
    </div>
  );
};
```

## 9. Testes Unitários (Exemplo)

```tsx
import { calculateHaversineDistance, nearestNeighbor } from '@/utils';

describe('Distance Utils', () => {
  test('Haversine distance calculation', () => {
    const dist = calculateHaversineDistance(-23.5505, -46.6333, -23.5505, -46.6333);
    expect(dist).toBe(0);
  });

  test('Nearest neighbor ordering', () => {
    const clients = [
      { id: '1', latitude: 0, longitude: 0 },
      { id: '2', latitude: 1, longitude: 0 },
      { id: '3', latitude: 0, longitude: 1 },
    ];
    
    const matrix = calculateDistanceMatrix(clients);
    const order = nearestNeighbor(['1', '2', '3'], matrix);
    
    expect(order).toHaveLength(3);
    expect(order[0]).toBe('1');
  });
});
```

## 10. Debugging

### Logging Detalhado
```tsx
const debugOptimization = (result: OptimizationResult) => {
  console.group('📊 Optimization Result');
  console.log('Routes:', result.routes.length);
  console.log('Clients:', result.summary.totalClientsAssigned);
  console.log('Utilization:', result.summary.averageUtilization + '%');
  
  result.routes.forEach(route => {
    console.group(`📍 ${route.day} - Promoter ${route.promoterId}`);
    console.log('Stops:', route.stops.length);
    console.log('Total Time:', route.totalTimeMinutes, 'min');
    route.stops.forEach(stop => {
      console.log(`  ${stop.order}. ${stop.clientName} (${stop.arrivalTime})`);
    });
    console.groupEnd();
  });
  
  console.groupEnd();
};
```
