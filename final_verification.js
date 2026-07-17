// Script para testar o algoritmo de intercalação com dados reais do TypeScript
const fs = require('fs');
const path = require('path');

// Código do algoritmo de intercalação (copiado do TypeScript)
function distributeNonConsecutiveDays(frequency, availableDays) {
  if (frequency <= 0 || availableDays.length === 0) return [];
  if (frequency === 1) return [availableDays[0]];
  if (availableDays.length === 1) return [...availableDays];
  
  const selectedDays = [];
  let targetDays = Math.min(frequency, availableDays.length);
  
  while (selectedDays.length === 0 && targetDays > 0) {
    const minGapSize = Math.ceil(availableDays.length / targetDays);
    
    let lastIndex = -minGapSize;
    for (let i = 0; i < availableDays.length && selectedDays.length < targetDays; i++) {
      if (i - lastIndex >= minGapSize) {
        selectedDays.push(availableDays[i]);
        lastIndex = i;
      }
    }
    
    if (selectedDays.length === targetDays) {
      let hasConsecutive = false;
      for (let i = 0; i < selectedDays.length - 1; i++) {
        const idx1 = availableDays.indexOf(selectedDays[i]);
        const idx2 = availableDays.indexOf(selectedDays[i + 1]);
        if (Math.abs(idx1 - idx2) === 1) {
          hasConsecutive = true;
          break;
        }
      }
      
      if (hasConsecutive) {
        selectedDays.length = 0;
        targetDays--;
      }
    }
  }
  
  if (selectedDays.length === 0) {
    selectedDays.push(availableDays[0]);
  }
  
  return selectedDays;
}

// Verifica se há dias consecutivos
function hasConsecutiveDays(days) {
  for (let i = 0; i < days.length - 1; i++) {
    if (Math.abs(days[i] - days[i + 1]) === 1) {
      return true;
    }
  }
  return false;
}

// Carrega dados de teste
const csv = fs.readFileSync('test_clientes.csv', 'utf-8');
const lines = csv.split('\n').filter(l => l.trim());

console.log('\n✅ Verificação Final de Intercalação de Dias\n');
console.log('=' .repeat(70));

let allGood = true;
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  const cod = parts[0];
  const freq = parseInt(parts[5]);
  
  const diasMarcados = [];
  const dayNames = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  const dayIndices = [];
  for (let j = 0; j < 6; j++) {
    if (parts[6 + j] === 'X') {
      diasMarcados.push(dayNames[j]);
      dayIndices.push(j);
    }
  }
  
  const resultado = distributeNonConsecutiveDays(freq, diasMarcados);
  const resultIndices = resultado.map(d => dayNames.indexOf(d));
  
  let hasConsec = false;
  for (let k = 0; k < resultIndices.length - 1; k++) {
    if (Math.abs(resultIndices[k] - resultIndices[k + 1]) === 1) {
      hasConsec = true;
      allGood = false;
      console.log(`❌ ID ${cod}: ${resultado.join('+')} - HAS CONSECUTIVE!`);
      break;
    }
  }
  
  if (!hasConsec) {
    const reduzido = resultado.length < freq ? ' (reduzido)' : '';
    console.log(`✅ ID ${cod}: ${resultado.join('+')}${reduzido}`);
  }
}

console.log('=' .repeat(70));
if (allGood) {
  console.log('\n✅ SUCESSO! Nenhum dia consecutivo encontrado!');
} else {
  console.log('\n❌ FALHA! Há dias consecutivos na intercalação!');
}
