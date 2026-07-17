const XLSX = require('xlsx');
const path = require('path');
const file = path.join(process.env.USERPROFILE, 'Downloads', 'Rotas_Otimizadas_2026-07-02.xlsx');
console.log('Lendo arquivo: ' + file);
const wb = XLSX.readFile(file);
const ws = wb.Sheets['Detalhes das Rotas'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Contar clientes únicos
const clients = new Set();
for (let i = 4; i < data.length; i++) {
  if (data[i] && data[i][3]) { // coluna com cliente está em índice 3
    clients.add(data[i][3]);
  }
}

console.log('');
console.log('📊 ANÁLISE DOS DETALHES DAS ROTAS');
console.log('==================================');
console.log('Total de linhas: ' + data.length);
console.log('Total de clientes ÚNICOS nas rotas: ' + clients.size);
console.log('');
console.log('Clientes nas rotas:');
Array.from(clients).forEach((c, idx) => {
  if (c && c.trim()) {
    console.log(`  ${idx + 1}. ${c}`);
  }
});
