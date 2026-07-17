const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/debug-export.json', 'utf8'));
const routes = data.rotas || [];

console.log('=== ANÁLISE DE GAP PARA FREQUÊNCIA 2 ===\n');

const clients2Freq = data.clients.filter(c => c.frequency === 2).slice(0,10);

clients2Freq.forEach(c => {
  console.log(`${c.name} (freq=${c.frequency})`);
  
  let allocated = {};
  routes.forEach(r => {
    Object.entries(r.agenda).forEach(([day, dayData]) => {
      if (dayData.stops) {
        dayData.stops.forEach(s => {
          if (s.clientId === c.id) {
            allocated[day] = '✓';
          }
        });
      }
    });
  });
  
  const daysOrder = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const days = Object.keys(allocated).filter(d => daysOrder.includes(d)).sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));
  
  const indices = days.map(d => daysOrder.indexOf(d));
  
  console.log(`  Dias alocados: ${days.join(', ')}`);
  console.log(`  Índices: [${indices.join(', ')}]`);
  
  if (indices.length === 2) {
    const diff = Math.abs(indices[1] - indices[0]);
    const status = diff <= 1 ? '❌ GAP INVÁLIDO (dias seguidos!)' : '✅ GAP OK';
    console.log(`  Diferença entre índices: ${diff} - ${status}`);
  }
  console.log();
});
