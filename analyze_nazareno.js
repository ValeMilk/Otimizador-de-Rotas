const fs = require('fs');
const csv = fs.readFileSync('C:\\Users\\LUCAS CACAU\\Downloads\\template_clientes (nazareno).csv', 'utf8');
const lines = csv.trim().split('\n');

console.log('Total de clientes:', lines.length - 1);

// Analisar padrão de bloqueios
const clients = lines.slice(1).map((line, idx) => {
  const parts = line.split(';');
  const dias = [parts[6], parts[7], parts[8], parts[9], parts[10], parts[11]];
  const bloqueios = dias.filter(d => d && d.trim() === 'X').length;
  const diasDisponiveis = 6 - bloqueios;
  const freq = parseInt(parts[5].trim(), 10);
  
  return {
    cod: parts[0].trim(),
    nome: parts[1].trim().substring(0, 35),
    freq: freq,
    bloqueios: bloqueios,
    diasDisponiveis: diasDisponiveis,
    minReq: Math.ceil(freq * 0.5),
    possivel: diasDisponiveis >= Math.ceil(freq * 0.5)
  };
});

console.log('\n=== ANALISE DE BLOQUEIOS ===\n');
const naoAlocaveis = clients.filter(c => !c.possivel);
console.log('Clientes IMPOSSÍVEIS (< 50% de freq):', naoAlocaveis.length);
naoAlocaveis.forEach(c => {
  console.log('  ' + c.cod + ' | ' + c.nome + ' | Freq:' + c.freq + ' Bloqueios:' + c.bloqueios + ' Disponíveis:' + c.diasDisponiveis);
});

console.log('\nClientes POSSÍVEIS (>= 50%):', clients.filter(c => c.possivel).length);

// Agrupar por número de bloqueios
console.log('\n=== DISTRIBUIÇÃO POR BLOQUEIOS ===');
const byBlockage = {};
clients.forEach(c => {
  if (!byBlockage[c.bloqueios]) byBlockage[c.bloqueios] = [];
  byBlockage[c.bloqueios].push(c);
});

Object.keys(byBlockage).sort().forEach(num => {
  const count = byBlockage[num].length;
  console.log('  ' + num + ' dias bloqueados: ' + count + ' clientes');
});
