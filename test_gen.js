const fs = require('fs');
const path = require('path');

// Importar o módulo de geração de rotas (compilado)
const { gerarRotasDinamicamente } = require('./dist/utils/dynamicRouteGenerator');

// Ler CSV
const csvPath = path.join(__dirname, 'test_mariana.csv');
console.log('Lendo:', csvPath);

const csv = fs.readFileSync(csvPath, 'utf8');
const lines = csv.trim().split('\n');

// Parsear dados simples (sem usar csvParser.ts)
const clientes = lines.slice(1).map((line, idx) => {
  const parts = line.split(';');
  return {
    id: parts[0].trim(),
    name: parts[1].trim(),
    latitude: parseFloat(parts[2].trim()),
    longitude: parseFloat(parts[3].trim()),
    visitDurationMinutes: timeToMinutes(parts[4].trim()),
    frequency: parseInt(parts[5].trim(), 10),
    visitorDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
    },
    promoterBlockedDays: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
    },
    promoterId: 'DEFAULT',
  };
});

console.log(`✓ ${clientes.length} clientes carregados`);

function timeToMinutes(timeStr) {
  if (!timeStr) return 30;
  const [h = 0, m = 0, s = 0] = timeStr.split(':').map(Number);
  return h * 60 + m + Math.round(s / 60);
}

// Gerar rotas
(async () => {
  const schedule = {
    'Segunda-feira': 8 * 60,
    'Terça-feira': 8 * 60,
    'Quarta-feira': 8 * 60,
    'Quinta-feira': 8 * 60,
    'Sexta-feira': 8 * 60,
    'Sábado': 4 * 60,
  };

  const promoters = [{ id: 'P1', latitude: -3.73, longitude: -38.52 }];

  console.log('Gerando rotas...');
  const result = await gerarRotasDinamicamente(clientes, schedule, promoters);
  
  console.log(`\n✅ RESULTADO:`);
  console.log(`  - Rotas criadas: ${result.rotas.length}`);
  console.log(`  - Clientes alocados: ${result.alocados.length}`);
  console.log(`  - Clientes NÃO alocados: ${result.naoAlocados.length}`);
  
  if (result.naoAlocados.length > 0) {
    console.log(`\n❌ Clientes não alocados:`);
    result.naoAlocados.slice(0, 10).forEach(c => {
      console.log(`  - ${c.id} ${c.name} (freq: ${c.frequency})`);
    });
  }
})();
