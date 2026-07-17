const fs = require('fs');
const lines = fs.readFileSync('f:/Otimizador de Rotas/exemplo_clientes.csv', 'utf-8').split('\n');

const header = lines[0].split(',').map(h => h.trim());
console.log('Colunas:', header);
console.log('');

const promoterIds = new Set();
for (let i = 1; i < Math.min(10, lines.length); i++) {
  const parts = lines[i].split(',');
  const cod = parts[0]?.trim();
  const nome = parts[1]?.trim();
  const freq = parts[5]?.trim();
  
  // Não há coluna de promoterId no CSV! Todos vão receber "DEFAULT"
  console.log(`${cod} - ${nome} - Frequência: ${freq}`);
}

console.log('');
console.log('⚠️ Não há coluna de promoterId no CSV!');
console.log('Todos os clientes receberão promoterId = "DEFAULT"');
