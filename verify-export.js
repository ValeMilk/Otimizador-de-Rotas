const XLSX = require('xlsx');
const fs = require('fs');

const dir = process.env.USERPROFILE + '\\Downloads';
const file = fs.readdirSync(dir).filter(f => f.match(/Rotas_Otimizadas.*\.xlsx/))[0];

if (!file) {
  console.log('No file found');
  process.exit(1);
}

console.log('Reading: ' + file);
const fullPath = dir + '\\' + file;
const wb = XLSX.readFile(fullPath);
console.log('\nSheets: ' + wb.SheetNames.join(', '));

// Read Clientes sheet
const ws = wb.Sheets['Clientes'];
const data = XLSX.utils.sheet_to_json(ws);
console.log('\nTotal rows in Clientes sheet: ' + data.length);

if (data.length > 0) {
  console.log('\nFirst 5 rows:');
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    console.log(`  ${i+1}. COD: ${row['CÓD']}, NOME: ${row['NOME FANTASIA']}, ROTA: ${row['ROTA']}, FREQ: ${row['FREQUÊNCIA']}`);
  }
  
  console.log('\nLast 5 rows:');
  const start = Math.max(0, data.length - 5);
  for (let i = start; i < data.length; i++) {
    const row = data[i];
    console.log(`  ${i+1}. COD: ${row['CÓD']}, NOME: ${row['NOME FANTASIA']}, ROTA: ${row['ROTA']}, FREQ: ${row['FREQUÊNCIA']}`);
  }
  
  // Count unique routes
  const rotas = new Set(data.map(r => r['ROTA']));
  console.log('\nUnique routes: ' + rotas.size);
  console.log('Routes: ' + Array.from(rotas).sort().join(', '));
  
  // Show summary
  console.log('\n✅ SUCCESS: ' + data.length + ' clients exported!');
}
