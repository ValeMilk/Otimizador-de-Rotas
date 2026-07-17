const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Carrega dados de teste
const csv = fs.readFileSync('test_clientes.csv', 'utf-8');
const lines = csv.split('\n').filter(l => l.trim());
const header = lines[0].split(',');

console.log('\n=== Análise dos Dados de Teste ===\n');

// Parse CSV
const clients = [];
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  const cod = parts[0];
  const nome = parts[1];
  const freq = parseInt(parts[5]);
  
  const diasMarcados = [];
  const dayNames = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  for (let j = 0; j < 6; j++) {
    if (parts[6 + j] === 'X') {
      diasMarcados.push(dayNames[j]);
    }
  }
  
  console.log(`ID ${cod}: FREQUÊNCIA=${freq}, DIAS MARCADOS=${diasMarcados.join('+')}`);
  
  clients.push({
    cod, nome, freq,
    diasMarcados
  });
}

console.log(`\n\n=== Algoritmo de Intercalação ===\n`);

// Simula o algoritmo de intercalação - REDUZ frequência se necessário
function distributeNonConsecutiveDays(frequency, availableDays) {
  if (frequency <= 0 || availableDays.length === 0) return [];
  if (frequency === 1) return [availableDays[0]];
  if (availableDays.length === 1) return availableDays;
  
  // Algoritmo: seleciona frequência dias de forma não-consecutiva
  // Se não conseguir, reduz frequência
  const selectedDays = [];
  let targetDays = Math.min(frequency, availableDays.length);
  
  while (selectedDays.length === 0 && targetDays > 1) {
    // Tenta selecionar targetDays dias sem consecutivos
    const minGapSize = Math.ceil(availableDays.length / targetDays);
    
    let lastIndex = -minGapSize;
    for (let i = 0; i < availableDays.length && selectedDays.length < targetDays; i++) {
      if (i - lastIndex >= minGapSize) {
        selectedDays.push(availableDays[i]);
        lastIndex = i;
      }
    }
    
    // Se conseguiu selecionar, verifica se não tem consecutivos
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
        // Reduz e tenta novamente
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

clients.forEach(client => {
  if (client.diasMarcados.length === 0) {
    console.log(`ID ${client.cod}: SEM DIAS DISPONÍVEIS`);
    return;
  }
  
  const resultado = distributeNonConsecutiveDays(client.freq, client.diasMarcados);
  const reduzido = resultado.length < client.freq ? ` (reduzido de ${client.freq})` : '';
  console.log(`ID ${client.cod}: freq=${client.freq}, ${client.diasMarcados.length} dias disponíveis → RESULTADO: ${resultado.join('+')}${reduzido}`);
});
