const fs = require('fs');

const csv = fs.readFileSync('ejemplo_clientes.csv', 'utf-8');
const lines = csv.split('\n');
const header = lines[0].split(',');

console.log('\n=== Clientes com múltiplos dias disponíveis ===\n');

let count = 0;
for (let i = 1; i < lines.length && count < 20; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const parts = line.split(',');
  const cod = parts[0];
  const nome = parts[1];
  const freq = parts[5];
  
  // Conta X nos dias (posições 6-11)
  const diasDisp = [];
  const dayNames = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  for (let j = 0; j < 6; j++) {
    if (parts[6 + j] === 'X') {
      diasDisp.push(dayNames[j]);
    }
  }
  
  if (diasDisp.length > 1) {
    console.log(`ID ${cod}: freq=${freq}, ${diasDisp.length} dias: ${diasDisp.join('+')}`);
    count++;
  }
}

if (count === 0) {
  console.log('Nenhum cliente tem múltiplos dias disponíveis no CSV!');
  console.log('\nTodos os 81 clientes têm apenas 1 dia disponível.');
}
