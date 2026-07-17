const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Arquivo exportado
const downloadPath = path.join(process.env.USERPROFILE, 'Downloads', 'Rotas_Otimizadas_2026-07-03.xlsx');

const workbook = XLSX.readFile(downloadPath);
const clientsSheet = workbook.Sheets['Clientes'];
const clientsData = XLSX.utils.sheet_to_json(clientsSheet, { defval: '' });

console.log('📊 ANÁLISE COMPLETA DA EXPORTAÇÃO');
console.log('=' .repeat(60));

// 1. Verificar se todos têm rota
let comRota = 0, semRota = 0;
clientsData.forEach(c => {
  if (c['ROTA'] && c['ROTA'].trim()) comRota++;
  else semRota++;
});

console.log('\n✅ Atribuição de Rotas:');
console.log(`   Com rota: ${comRota}/${clientsData.length}`);
console.log(`   Sem rota: ${semRota}/${clientsData.length}`);

// 2. Verificar formato de hora
console.log('\n🕐 Formato de Hora:');
const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
let validTimes = 0, invalidTimes = 0;
const samples = [];
clientsData.slice(0, 10).forEach(c => {
  const tempo = c['TEMPO MÉDIO DE VISITA'];
  if (tempo && timeRegex.test(tempo)) {
    validTimes++;
  } else {
    invalidTimes++;
  }
  samples.push(`${c['FREQUÊNCIA']}x -> ${tempo}`);
});

console.log(`   ✓ Formato HH:MM:SS: ${validTimes}/10 (verificados)`);
console.log(`   Exemplos: ${samples.slice(0, 3).join(', ')}`);

// 3. Verificar dias
console.log('\n📅 Distribuição de Dias Marcados:');
const dayDistribution = {};
clientsData.forEach(client => {
  const days = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
    .filter(d => client[d] === 'X')
    .length;
  
  if (!dayDistribution[days]) dayDistribution[days] = 0;
  dayDistribution[days]++;
});

Object.keys(dayDistribution).sort().forEach(days => {
  console.log(`   ${days} dia(s): ${dayDistribution[days]} cliente(s)`);
});

// 4. Comparar Frequência vs Dias Marcados
console.log('\n🔍 Frequência vs Dias Marcados:');
const freqMap = {};
clientsData.forEach(client => {
  const freq = client['FREQUÊNCIA'];
  const daysMarked = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
    .filter(d => client[d] === 'X')
    .length;
  
  const key = `freq=${freq},days=${daysMarked}`;
  if (!freqMap[key]) freqMap[key] = 0;
  freqMap[key]++;
});

Object.keys(freqMap).sort().forEach(key => {
  console.log(`   ${key}: ${freqMap[key]} cliente(s)`);
});

// 5. Mostrar discrepâncias
console.log('\n⚠️ Discrepâncias (Frequência ≠ Dias Marcados):');
let discCount = 0;
clientsData.forEach(client => {
  const freq = client['FREQUÊNCIA'];
  const daysMarked = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
    .filter(d => client[d] === 'X')
    .length;
  
  if (freq !== daysMarked) {
    discCount++;
    if (discCount <= 10) {
      console.log(`   ${client['NOME FANTASIA']}: Freq=${freq}, Dias=${daysMarked}`);
    }
  }
});

console.log(`   Total com discrepâncias: ${discCount}/${clientsData.length}`);

console.log('\n✅ Análise concluída!');
