/**
 * Script para analisar arquivo do usuário
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Copiar arquivo anexado para análise
const sourcePath = './template_clientes.xlsx';
const destPath = './template_analise.xlsx';

// Se o arquivo existe, analisar
if (fs.existsSync(sourcePath)) {
  console.log('📊 Analisando arquivo do usuário...\n');

  try {
    const wb = XLSX.readFile(sourcePath);
    
    console.log('📋 Sheets encontradas:', wb.SheetNames);
    console.log('');

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws);
      
      console.log(`\n📄 Sheet: "${sheetName}"`);
      console.log(`   Total de linhas: ${data.length}`);
      
      if (data.length > 0) {
        console.log(`\n   📌 Headers encontrados:`);
        const headers = Object.keys(data[0]);
        headers.forEach((h, i) => {
          console.log(`      ${i + 1}. "${h}"`);
        });

        console.log(`\n   📝 Primeiras 3 linhas:`);
        data.slice(0, 3).forEach((row, idx) => {
          console.log(`\n      Linha ${idx + 1}:`);
          Object.entries(row).forEach(([key, value]) => {
            console.log(`        ${key}: ${JSON.stringify(value)}`);
          });
        });

        // Validar
        console.log(`\n   ✅ Validação:`);
        data.forEach((row, idx) => {
          const id = String(row['CÓD'] || '').trim();
          const name = String(row['NOME FANTASIA'] || '').trim();
          const lat = String(row['LATITUDE'] || '').trim();
          const lon = String(row['LONGITUDE'] || '').trim();
          const time = String(row['TEMPO MÉDIO DE VISITA'] || '').trim();
          const freq = String(row['FREQUÊNCIA'] || '').trim();

          const latitude = parseFloat(lat);
          const frequency = parseInt(freq, 10);

          console.log(`      Linha ${idx + 1}:`);
          console.log(`        CÓD: "${id}" ${id ? '✓' : '❌'}`);
          console.log(`        NOME: "${name}" ${name ? '✓' : '❌'}`);
          console.log(`        LAT: "${lat}" → ${latitude} ${latitude !== 0 ? '✓' : '❌'}`);
          console.log(`        LON: "${lon}" → ${parseFloat(lon)} ${parseFloat(lon) !== 0 ? '✓' : '❌'}`);
          console.log(`        TEMPO: "${time}" ${time ? '✓' : '❌'}`);
          console.log(`        FREQ: "${freq}" → ${frequency} ${!isNaN(frequency) && frequency > 0 ? '✓' : '❌'}`);

          const isValid = id && name && latitude !== 0 && parseFloat(lon) !== 0 && !isNaN(frequency) && frequency > 0;
          console.log(`        🔍 VÁLIDO: ${isValid ? '✅ SIM' : '❌ NÃO'}\n`);
        });
      } else {
        console.log('   ⚠️  Nenhuma linha de dados encontrada');
      }
    }

  } catch (err) {
    console.error('❌ Erro ao ler arquivo:', err.message);
  }
} else {
  console.log('❌ Arquivo não encontrado');
}
