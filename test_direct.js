const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');

// Importar engine de otimização
const { optimize Routes } = require('./utils/optimizationEngine.ts');

// Ler arquivo de teste
const csvPath = path.join(__dirname, 'test_clientes.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

console.log('📂 Lendo arquivo:', csvPath);
console.log('📊 Primeiras 200 caracteres:', csvContent.substring(0, 200));

// Parsear CSV
Papa.parse(csvContent, {
  header: true,
  complete: (results) => {
    console.log(`\n✅ Parseado ${results.data.length} linhas`);
    
    // Mostrar primeiros 3 clientes
    console.log('\n📋 Primeiros 3 clientes:');
    results.data.slice(0, 3).forEach((row, idx) => {
      console.log(`\n${idx + 1}. ${row['NOME FANTASIA']} (ID: ${row['CÓD']})`);
      console.log(`   Frequência: ${row['FREQUÊNCIA']}`);
      console.log(`   Dias: SEG=${row['SEG']}, TER=${row['TER']}, QUA=${row['QUA']}, QUI=${row['QUI']}, SEX=${row['SEX']}, SAB=${row['SAB']}`);
    });
  },
  error: (error) => {
    console.error('❌ Erro ao parsear CSV:', error);
  }
});
