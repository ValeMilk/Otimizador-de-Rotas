const fs = require('fs');

// Lê arquivo original
const conteudo = fs.readFileSync('auto serviço 2026.csv', 'utf8');
const linhas = conteudo.split('\n').map(l => l.trim()).filter(l => l);

console.log('📊 Processando "auto serviço 2026.csv"...\n');
console.log(`Total de clientes: ${linhas.length - 1}\n`);

// Novo header completo
const novoHeader = [
  'CÓD',
  'NOME FANTASIA',
  'LATITUDE',
  'LONGITUDE',
  'TEMPO MÉDIO DE VISITA',
  'FREQUÊNCIA',
  'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', // dias disponíveis do cliente
  'SEG (Dias do Vendedor)', 'TER (Dias do Vendedor)', 'QUA (Dias do Vendedor)',
  'QUI (Dias do Vendedor)', 'SEX (Dias do Vendedor)', 'SAB (Dias do Vendedor)'
];

const novasLinhas = [novoHeader.join(',')];
let corrigidos = 0;

// Processa cada cliente
for (let i = 1; i < linhas.length; i++) {
  const campos = linhas[i].split(';');
  
  const cod = campos[0];
  const nome = campos[1];
  let lat = campos[2];
  let lon = campos[3];
  const tempo = campos[4];
  const freq = campos[5];
  
  // CORRIGE coordenadas com erro
  if (lon === '-385204755') {
    lon = '-38.5204755';
    console.log(`✅ Corrigida coordenada linha ${i + 1}: ${nome} (lon: -385204755 → -38.5204755)`);
    corrigidos++;
  }
  if (lon && lon.includes('...')) {
    lon = lon.replace('...', '.');
    console.log(`✅ Corrigida coordenada linha ${i + 1}: ${nome} (removido ...)`);
    corrigidos++;
  }
  if (lat === '-38547114') {
    lat = '-3.8547114';
    console.log(`✅ Corrigida coordenada linha ${i + 1}: ${nome} (lat: -38547114 → -3.8547114)`);
    corrigidos++;
  }
  
  // Dias do vendedor (colunas 6-11)
  const diasVendedor = campos.slice(6, 12).map(d => d.trim() || '');
  
  // Se TODOS os dias do vendedor estão vazios, cliente está disponível TODOS os dias
  const todosVazios = diasVendedor.every(d => d === '');
  const diasCliente = todosVazios 
    ? ['', '', '', '', '', ''] // TODOS disponíveis (vazios = true no parser)
    : diasVendedor.map(d => d === 'X' ? 'X' : ''); // Copia dias do vendedor
  
  // Monta nova linha
  const novaLinha = [
    cod,
    `"${nome}"`,
    lat,
    lon,
    tempo,
    freq,
    ...diasCliente,
    ...diasVendedor
  ].join(',');
  
  novasLinhas.push(novaLinha);
}

// Salva novo arquivo
const novoConteudo = novasLinhas.join('\n');
fs.writeFileSync('auto_servico_2026_corrigido.csv', novoConteudo, 'utf8');

console.log(`\n✅ Arquivo salvo: auto_servico_2026_corrigido.csv`);
console.log(`📊 Total: ${linhas.length - 1} clientes`);
console.log(`🔧 Coordenadas corrigidas: ${corrigidos}`);
