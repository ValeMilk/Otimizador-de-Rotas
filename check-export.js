const XLSX = require('xlsx');
const file = XLSX.readFile('Teste_Nova_Exportacao.xlsx');
const sheets = file.SheetNames;

console.log('Planilhas:', sheets);
sheets.forEach(sheet => {
  const data = XLSX.utils.sheet_to_json(file.Sheets[sheet], { defval: '' });
  console.log(`\n📄 Planilha: ${sheet}`);
  console.log(`   Linhas: ${data.length}`);
  if (data.length > 0) {
    console.log('   Primeiras linhas:');
    data.slice(0, 3).forEach((row, i) => {
      const rowStr = JSON.stringify(row).substring(0, 120);
      console.log(`     [${i}]: ${rowStr}...`);
    });
  }
});
