const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/debug-export.json', 'utf8'));
const clients = data.clients || [];

const daysOrder = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

console.log('=== FULL GAP ANALYSIS ===\n');

// Group by frequency
const byFreq = {};
clients.forEach(c => {
  if (!byFreq[c.frequency]) byFreq[c.frequency] = [];
  byFreq[c.frequency].push(c);
});

// Analyze each frequency
Object.keys(byFreq).sort((a, b) => parseInt(a) - parseInt(b)).forEach(freq => {
  console.log(`\n📊 FREQUÊNCIA ${freq}`);
  console.log(`   Total: ${byFreq[freq].length} clientes`);
  
  let allValid = true;
  let violations = [];
  
  byFreq[freq].forEach(c => {
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
      // Check gap rule
      let valid = true;
      const gaps = [];
      
      for (let i = 1; i < dias.length; i++) {
        const gap = Math.abs(dias[i] - dias[i-1]);
        gaps.push(gap);
        
        // Rule: freq < 4 requires gap > 1
        if (freq < 4 && gap <= 1) {
          valid = false;
          allValid = false;
        }
      }
      
      if (!valid) {
        violations.push({
          name: c.name,
          dias: dias,
          gaps: gaps
        });
      }
    }
  });
  
  if (allValid) {
    console.log(`   ✅ Todas os ${byFreq[freq].length} clientes respeitam a regra de gap`);
  } else {
    console.log(`   ❌ ${violations.length} violações encontradas:`);
    violations.forEach(v => {
      console.log(`      ${v.name}: [${v.dias.join(', ')}] gaps=[${v.gaps.join(', ')}]`);
    });
  }
});

// Summary
console.log('\n=== RESUMO DE REGRAS ===');
console.log('freq < 4 (1, 2, 3): Gap obrigatório (diff > 1)');
console.log('freq >= 4 (4, 5, ...): Sem restrição de gap (permite dias seguidos)');
