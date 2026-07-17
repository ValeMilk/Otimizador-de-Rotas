const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Arquivo exportado
const downloadPath = path.join(process.env.USERPROFILE, 'Downloads', 'Rotas_Otimizadas_2026-07-03.xlsx');

if (!fs.existsSync(downloadPath)) {
  console.error('❌ Arquivo não encontrado:', downloadPath);
  process.exit(1);
}

console.log('📂 Lendo arquivo:', downloadPath);
const workbook = XLSX.readFile(downloadPath);

console.log('\n📋 Sheets disponíveis:', workbook.SheetNames);

// Analisar sheet de Clientes
if (workbook.SheetNames.includes('Clientes')) {
  const clientsSheet = workbook.Sheets['Clientes'];
  
  // Obter dados com header=0 para manter a linha de header
  const clientsData = XLSX.utils.sheet_to_json(clientsSheet, { defval: '' });

  console.log('\n✅ Sheet "Clientes" com', clientsData.length, 'linhas');
  
  // Mostrar headers
  console.log('\n📝 Headers detectados:');
  if (clientsData.length > 0) {
    const keys = Object.keys(clientsData[0]);
    keys.forEach((k, i) => {
      console.log(`   ${i + 1}. "${k}"`);
    });
  }

  console.log('\n📊 Primeiros 5 clientes (dados brutos):');

  clientsData.slice(0, 5).forEach((client, idx) => {
    console.log(`\n${idx + 1}. Dados completos:`, JSON.stringify(client, null, 2));
  });
}

console.log('\n✅ Verificação concluída!');
