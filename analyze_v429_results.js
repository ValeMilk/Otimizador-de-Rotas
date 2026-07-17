const fs = require('fs');
const csv = fs.readFileSync('C:\\Users\\LUCAS CACAU\\Downloads\\template_clientes (nazareno).csv', 'utf8');

const DIAS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const lines = csv.trim().split('\n');

const allClients = lines.slice(1).map((line, idx) => {
  const parts = line.split(';');
  const freq = parseInt(parts[5].trim(), 10);
  
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
    nome: parts[1].trim().substring(0, 40),
    freq: freq,
    diaBloqueado: diaBloqueado >= 0 ? DIAS[diaBloqueado] : 'NENHUM',
  };
});

// Clientes que DEVEM ser alocados com v4.2.9 (distribuição uniforme)
const houldAllocate = allClients.filter(c => c.freq >= 4);

console.log('=== ANÁLISE v4.2.9 ===\n');
console.log('Total de clientes: ' + allClients.length);
console.log('Clientes com freq >= 4 (distribuição uniforme): ' + houldAllocate.length);
console.log('Clientes esperados alocados: ' + houldAllocate.length + '\n');

console.log('=== TOP CLIENTES COM FREQ >= 4 ===\n');
houldAllocate.sort((a, b) => b.freq - a.freq);
houldAllocate.slice(0, 15).forEach((c, i) => {
  console.log((i+1) + '. ' + c.cod + ' | ' + c.nome + ' | Freq:' + c.freq + ' | Bloqueado: ' + c.diaBloqueado);
});

console.log('\n\n=== PARA VALIDAR v4.2.9 ===');
console.log('Cliente 10752 DEVE estar em SEG/TER/QUA/SEX/SÁB (não QUI)');
console.log('Isso é 1 visita em cada dia (distribuição uniforme)');
