const XLSX = require('xlsx');
const path = require('path');

const file = path.join(process.env.USERPROFILE, 'Downloads', 'Rotas_Otimizadas_2026-07-02.xlsx');
const wb = XLSX.readFile(file);
const ws = wb.Sheets['Clientes'];
const data = XLSX.utils.sheet_to_json(ws);

console.log('\n=== Verificação de Dias Não-Consecutivos ===\n');

// Analisa os primeiros 15 clientes
const sample = data.slice(0, 15);
let hasConsecutiveDays = false;

sample.forEach(row => {
  const days = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  const dayIndices = days
    .map((day, idx) => row[day] ? idx : -1)
    .filter(idx => idx >= 0);
  
  const visitDays = days.filter(day => row[day]).join('+');
  const frequency = row['FREQUÊNCIA'] || 0;
  
  // Verifica se há dias consecutivos
  let hasConsecutive = false;
  for (let i = 0; i < dayIndices.length - 1; i++) {
    if (dayIndices[i + 1] - dayIndices[i] === 1) {
      hasConsecutive = true;
      hasConsecutiveDays = true;
      break;
    }
  }
  
  const status = hasConsecutive ? ' ⚠️ CONSECUTIVO!' : ' ✓';
  console.log(`ID ${row['CÓD']}: freq=${frequency}, dias=${visitDays}${status}`);
});

console.log(`\n${hasConsecutiveDays ? '⚠️ PROBLEMA: Encontrados dias consecutivos!' : '✓ OK: Nenhum dia consecutivo encontrado!'}`);
console.log(`\nTotal de clientes exportados: ${data.length}`);
