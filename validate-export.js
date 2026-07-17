const XLSX = require('xlsx');
const wb = XLSX.readFile('C:\\Users\\LUCAS CACAU\\Downloads\\Rotas_Otimizadas_2026-07-02.xlsx');
const ws = wb.Sheets['Clientes'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('');
console.log('📊 VALIDAÇÃO DA EXPORTAÇÃO');
console.log('============================');
console.log('Total de linhas: ' + data.length);
console.log('Cabeçalho: ' + data[0].join(' | '));
console.log('');
console.log('Primeiros 3 clientes:');
for (let i = 1; i <= 3; i++) {
  if (data[i]) {
    console.log('  ' + i + '. ' + data[i][0] + ' - ' + data[i][1]);
  }
}
console.log('  ...');
console.log('Últimos 3 clientes:');
for (let i = Math.max(1, data.length - 3); i < data.length; i++) {
  console.log('  ' + i + '. ' + data[i][0] + ' - ' + data[i][1]);
}
console.log('');
console.log('============================');
console.log('✅ Total de CLIENTES: ' + (data.length - 1));
if ((data.length - 1) === 81) {
  console.log('🎉 SUCESSO! TODOS OS 81 CLIENTES FORAM EXPORTADOS!');
} else {
  console.log('⚠️ Apenas ' + (data.length - 1) + ' clientes (esperado 81)');
}
