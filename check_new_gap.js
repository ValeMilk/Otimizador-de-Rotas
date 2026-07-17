const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/debug-export.json', 'utf8'));
const clients = data.clients || [];

console.log('Total clientes no CSV:', clients.length);

let alocados = new Set();
data.rotas.forEach(r => {
  Object.values(r.agenda).forEach(day => {
    if (day.stops) {
      day.stops.forEach(s => {
        alocados.add(s.clientId);
      });
    }
  });
});

console.log('Clientes alocados:', alocados.size);
console.log('Taxa de alocação:', Math.round(alocados.size / clients.length * 100) + '%');

console.log('\n=== GAP ANALYSIS - FREQUÊNCIA 3 ===\n');

const daysOrder = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const clients3 = clients.filter(c => c.frequency === 3);

clients3.forEach(c => {
  let dias = [];
  data.rotas.forEach(r => {
    Object.entries(r.agenda).forEach(([d, dd]) => {
      if (dd.stops) {
        dd.stops.forEach(s => {
          if (s.clientId === c.id) {
            dias.push(daysOrder.indexOf(d));
          }
        });
      }
    });
  });
  
  dias = Array.from(new Set(dias)).sort((a, b) => a - b);
  
  if (dias.length > 0) {
    console.log(`${c.name}`);
    console.log(`  Frequência: ${c.frequency}`);
    console.log(`  Dias alocados: ${dias.map(d => daysOrder[d]).join(', ')}`);
    console.log(`  Índices: [${dias.join(', ')}]`);
    
    const gaps = [];
    for (let i = 1; i < dias.length; i++) {
      const gap = Math.abs(dias[i] - dias[i-1]);
      gaps.push(gap);
      const valid = gap > 1 ? '✅' : '❌';
      console.log(`    [${dias[i-1]}] -> [${dias[i]}] = diff: ${gap} ${valid}`);
    }
  }
  console.log();
});
