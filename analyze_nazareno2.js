const fs = require('fs');
const csv = fs.readFileSync('C:\\Users\\LUCAS CACAU\\Downloads\\template_clientes (nazareno).csv', 'utf8');
const lines = csv.trim().split('\n');

const DIAS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

const clients = lines.slice(1).map((line, idx) => {
  const parts = line.split(';');
  const freq = parseInt(parts[5].trim(), 10);
  const tempoVisita = parseTime(parts[4].trim());
  
  // Qual dia está bloqueado?
  let diaBloqueado = -1;
  for (let i = 0; i < 6; i++) {
    if (parts[6 + i] && parts[6 + i].trim() === 'X') {
      diaBloqueado = i;
      break;
    }
  }
  
  return {
    cod: parts[0].trim(),
    nome: parts[1].trim().substring(0, 30),
    freq: freq,
    tempoVisita: tempoVisita,
    diaBloqueado: diaBloqueado >= 0 ? DIAS[diaBloqueado] : 'NENHUM',
    diasDisponiveis: 5, // 6 - 1 bloqueado
    custoSemanal: freq * tempoVisita,
  };
});

function parseTime(timeStr) {
  if (!timeStr) return 30;
  const [h = 0, m = 0, s = 0] = timeStr.split(':').map(Number);
  return h * 60 + m + Math.round(s / 60);
}

// Agrupar por dia bloqueado
const byDay = {};
clients.forEach(c => {
  if (!byDay[c.diaBloqueado]) byDay[c.diaBloqueado] = [];
  byDay[c.diaBloqueado].push(c);
});

console.log('=== DISTRIBUIÇÃO POR DIA BLOQUEADO ===\n');
Object.keys(byDay).sort().forEach(day => {
  const list = byDay[day];
  console.log(day + ' bloqueado: ' + list.length + ' clientes');
  
  // Ordenar por custo semanal
  list.sort((a, b) => b.custoSemanal - a.custoSemanal);
  
  // Top 3 com maior custo
  console.log('  Top 3 com maior tempo/semana:');
  list.slice(0, 3).forEach(c => {
    const horas = Math.floor(c.custoSemanal / 60);
    const mins = c.custoSemanal % 60;
    console.log('    ' + c.cod + ' | ' + c.nome + ' | Freq:' + c.freq + ' | ' + horas + 'h' + mins + 'm/semana');
  });
  console.log('');
});

// Clientes com maior custo total
console.log('=== TOP 15 CLIENTES COM MAIOR CUSTO SEMANAL ===\n');
const sorted = [...clients].sort((a, b) => b.custoSemanal - a.custoSemanal);
sorted.slice(0, 15).forEach((c, i) => {
  const horas = Math.floor(c.custoSemanal / 60);
  const mins = c.custoSemanal % 60;
  console.log((i+1) + '. ' + c.cod + ' | ' + c.nome + ' | Freq:' + c.freq + ' | Tempo:' + c.tempoVisita + 'min | Total:' + horas + 'h' + mins + 'm | Bloqueado: ' + c.diaBloqueado);
});
