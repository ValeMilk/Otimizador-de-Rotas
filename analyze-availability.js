const fs = require('fs');
const lines = fs.readFileSync('f:/Otimizador de Rotas/exemplo_clientes.csv', 'utf-8').split('\n');

// Parse CSV
const header = lines[0].split(',').map(h => h.trim());
const dayColumns = header.slice(6); // SEG, TER, QUA, etc

console.log('');
console.log('📋 ANÁLISE DE DISPONIBILIDADE');
console.log('=============================');
console.log('Colunas de dias:', dayColumns);
console.log('');

// Analyzepatterns
let totalWithAvailability = 0;
let totalNoAvailability = 0;

for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  if (parts.length < 12) continue;
  
  const cod = parts[0].trim();
  const nome = parts[1].trim();
  const days = parts.slice(6).map(d => d.trim());
  
  const hasAvailability = days.some(d => d === 'X');
  
  if (hasAvailability) {
    totalWithAvailability++;
    if (totalWithAvailability <= 5) {
      console.log(`✅ ${cod} - ${nome}`);
      console.log(`   Disponível em: ${dayColumns.map((day, idx) => days[idx] === 'X' ? day : '').filter(Boolean).join(', ')}`);
    }
  } else {
    totalNoAvailability++;
    if (totalNoAvailability <= 3) {
      console.log(`❌ ${cod} - ${nome}`);
      console.log(`   Sem disponibilidade (todas as colunas vazias)`);
    }
  }
}

console.log('');
console.log('Resumo:');
console.log(`- Clientes COM disponibilidade: ${totalWithAvailability}`);
console.log(`- Clientes SEM disponibilidade: ${totalNoAvailability}`);
