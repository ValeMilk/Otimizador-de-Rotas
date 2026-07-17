const XLSX = require('xlsx');
const fs = require('fs');

const dir = process.env.USERPROFILE + '\\Downloads';
const files = fs.readdirSync(dir).filter(f => f.match(/Rotas_Otimizadas.*\.xlsx/));
const latestFile = files.sort().reverse()[0];

if (!latestFile) {
  console.log('No file found');
  process.exit(1);
}

console.log('Reading: ' + latestFile);
const fullPath = dir + '\\' + latestFile;
const wb = XLSX.readFile(fullPath);

// Read Clientes sheet
const ws = wb.Sheets['Clientes'];
const data = XLSX.utils.sheet_to_json(ws);

console.log('\n📋 Colunas na planilha:');
if (data.length > 0) {
  console.log(Object.keys(data[0]).join(' | '));
}

console.log('\n📊 Primeiras 3 linhas com TEMPO MÉDIO:');
for (let i = 0; i < Math.min(3, data.length); i++) {
  const row = data[i];
  console.log(`${i+1}. ${row['CÓD']} | ${row['NOME FANTASIA']} | ${row['ROTA']} | FREQ: ${row['FREQUÊNCIA']} | TEMPO: ${row['TEMPO MÉDIO DE VISITA']}`);
}

console.log('\n✅ Total de clientes: ' + data.length);
