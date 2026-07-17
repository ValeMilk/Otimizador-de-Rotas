const fs = require('fs');
const lines = fs.readFileSync('f:/Otimizador de Rotas/exemplo_clientes.csv', 'utf-8').split('\n');

console.log('');
console.log('📋 ESTRUTURA DO CSV');
console.log('===================');
console.log('Cabeçalho:');
console.log(lines[0]);
console.log('');
console.log('Primeiro cliente (linha 2):');
console.log(lines[1]);
console.log('');
console.log('Segundo cliente (linha 3):');
console.log(lines[2]);
console.log('');
console.log('Total de linhas: ' + lines.length);

// Verificar coluna de disponibilidade
const header = lines[0].split(',');
console.log('');
console.log('Colunas:');
header.forEach((col, i) => {
  console.log(`  ${i}: ${col.trim()}`);
});
