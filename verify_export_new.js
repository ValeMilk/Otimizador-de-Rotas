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
  const clientsData = XLSX.utils.sheet_to_json(clientsSheet);

  console.log('\n✅ Sheet "Clientes" com', clientsData.length, 'linhas');
  console.log('\n📊 Primeiros 5 clientes:');

  clientsData.slice(0, 5).forEach((client, idx) => {
    console.log(`\n${idx + 1}. ID: ${client['ID do Cliente']}, Nome: ${client['Nome do Cliente']}`);
    console.log(`   Frequência: ${client['Frequência']}`);
    console.log(`   Duração de Visita: ${client['Duração de Visita (hh:mm:ss)']}`);
    console.log(`   Dias: SEG=${client['SEG']}, TER=${client['TER']}, QUA=${client['QUA']}, QUI=${client['QUI']}, SEX=${client['SEX']}, SAB=${client['SAB']}`);
  });

  // Verificar formato de tempo
  console.log('\n🕐 Verificação de Formato de Tempo:');
  const tempoCol = clientsData.map(c => c['Duração de Visita (hh:mm:ss)']);
  const tempoUnicos = [...new Set(tempoCol)].slice(0, 10);
  
  console.log('   Valores únicos de tempo (primeiros 10):');
  tempoUnicos.forEach(t => {
    if (t && typeof t === 'string') {
      console.log(`   - "${t}"`);
    } else {
      console.log(`   - ${t} (tipo: ${typeof t})`);
    }
  });

  // Verificar padrão HH:MM:SS
  const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
  const validTimes = tempoUnicos.filter(t => t && timeRegex.test(t));
  console.log(`\n✓ Tempos em formato HH:MM:SS: ${validTimes.length}/${tempoUnicos.filter(t => t).length}`);

  // Contar clientes com vários dias
  console.log('\n📅 Verificação de Dias (visitas esperadas):');
  let multiDayCount = 0;
  let singleDayCount = 0;
  
  clientsData.forEach(client => {
    const days = [client['SEG'], client['TER'], client['QUA'], client['QUI'], client['SEX'], client['SAB']].filter(d => d === 'X').length;
    if (days > 1) multiDayCount++;
    else if (days === 1) singleDayCount++;
  });

  console.log(`   Total clientes: ${clientsData.length}`);
  console.log(`   Com 1 dia: ${singleDayCount}`);
  console.log(`   Com 2+ dias: ${multiDayCount}`);

  // Mostrar alguns clientes com múltiplos dias
  if (multiDayCount > 0) {
    console.log('\n🎯 Exemplos de clientes com múltiplos dias:');
    clientsData.filter(c => {
      const days = [c['SEG'], c['TER'], c['QUA'], c['QUI'], c['SEX'], c['SAB']].filter(d => d === 'X').length;
      return days > 1;
    }).slice(0, 5).forEach(c => {
      const dias = [];
      if (c['SEG'] === 'X') dias.push('SEG');
      if (c['TER'] === 'X') dias.push('TER');
      if (c['QUA'] === 'X') dias.push('QUA');
      if (c['QUI'] === 'X') dias.push('QUI');
      if (c['SEX'] === 'X') dias.push('SEX');
      if (c['SAB'] === 'X') dias.push('SAB');
      console.log(`   - ${c['Nome do Cliente']}: Freq=${c['Frequência']}, Dias=${dias.join(', ')}`);
    });
  }
}

console.log('\n✅ Verificação concluída!');
