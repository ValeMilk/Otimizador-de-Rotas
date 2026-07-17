const XLSX = require('xlsx');
const fs = require('fs');

const file = 'C:\\Users\\LUCAS CACAU\\Downloads\\Rotas_Otimizadas_2026-07-03.xlsx';
const wb = XLSX.readFile(file);

console.log('\n📋 SHEETS:', wb.SheetNames);

const ws_clients = wb.Sheets['Clientes'];
const clients = XLSX.utils.sheet_to_json(ws_clients);

console.log('\n📊 TOTAL CLIENTES:', clients.length);
console.log('\n🔍 PRIMEIROS 15 CLIENTES:');

clients.slice(0, 15).forEach(c => {
  console.log(`\nCÓD: ${c['CÓD']} - ${c['NOME FANTASIA']}`);
  console.log(`  Frequência: ${c['FREQUÊNCIA']} | Tempo: ${c['TEMPO MÉDIO DE VISITA']} | Rota: ${c['ROTA']}`);
  console.log(`  Dias: SEG=${c['SEG']||'.'} TER=${c['TER']||'.'} QUA=${c['QUA']||'.'} QUI=${c['QUI']||'.'} SEX=${c['SEX']||'.'} SAB=${c['SAB']||'.'}`);
});

// Analyze distribution
console.log('\n\n📈 ANÁLISE DE DISTRIBUIÇÃO:');
const byRoute = {};
clients.forEach(c => {
  const rota = c['ROTA'] || 'SEM ROTA';
  byRoute[rota] = (byRoute[rota] || 0) + 1;
});

Object.entries(byRoute).sort().forEach(([rota, count]) => {
  console.log(`  ${rota}: ${count} clientes`);
});

// Check total visits vs frequency
const totalFreq = clients.reduce((sum, c) => sum + parseInt(c['FREQUÊNCIA'] || 0), 0);
console.log(`\n📍 Total Clientes: ${clients.length}`);
console.log(`📍 Total Visitas (soma frequência): ${totalFreq}`);
console.log(`📍 Média de clientes por rota: ${(clients.length / Object.keys(byRoute).length).toFixed(1)}`);
