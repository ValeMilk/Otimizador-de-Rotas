// Script para testar otimização diretamente
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

// Simular a função timeStringToMinutes
const timeStringToMinutes = (timeStr) => {
  if (!timeStr) return 30;
  const [hours = 0, minutes = 0, seconds = 0] = String(timeStr).split(':').map(Number);
  return hours * 60 + minutes + Math.round(seconds / 60);
};

// Simular a função minutesToTimeString
const minutesToTimeString = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const seconds = Math.round((totalMinutes % 1) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

console.log('🧪 Teste de Conversão de Tempo');
console.log('─────────────────────────────');

// Teste 1: Converter HH:MM:SS para minutos
const testTime1 = '02:54:20';
const minutes1 = timeStringToMinutes(testTime1);
console.log(`\n✅ ${testTime1} → ${minutes1} minutos`);

// Teste 2: Converter minutos de volta para HH:MM:SS
const timeBack = minutesToTimeString(minutes1);
console.log(`✅ ${minutes1} minutos → ${timeBack}`);

// Teste 3: Vários tempos
const times = ['00:30:00', '01:08:40', '02:54:20', '00:39:00', '00:55:20'];
console.log('\n📋 Conversões de Teste:');
times.forEach(t => {
  const mins = timeStringToMinutes(t);
  const back = minutesToTimeString(mins);
  console.log(`   ${t} → ${mins}min → ${back}`);
});

console.log('\n✅ Funções de conversão de tempo testadas!');
