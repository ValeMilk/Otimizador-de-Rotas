const fs = require('fs');

// Lê arquivo original
const conteudo = fs.readFileSync('template_clientes (nazareno).csv', 'utf8');
const linhas = conteudo.split('\n').map(l => l.trim()).filter(l => l);

console.log('📊 Analisando CSV...\n');
console.log(`Total de linhas: ${linhas.length}`);
console.log(`Total de clientes: ${linhas.length - 1}\n`);

// Header original (sem dias do cliente)
const headerOriginal = linhas[0].split(';');
console.log('📋 Colunas originais:', headerOriginal.length);

// Novo header (COM dias do cliente)
const novoHeader = [
  'CÓD',
  'NOME FANTASIA',
  'LATITUDE',
  'LONGITUDE',
  'TEMPO MÉDIO DE VISITA',
  'FREQUÊNCIA',
  'SEG', // dias disponíveis do CLIENTE
  'TER',
  'QUA',
  'QUI',
  'SEX',
  'SAB',
  'SEG (Dias do Vendedor)', // dias que vendedor já visita
  'TER (Dias do Vendedor)',
  'QUA (Dias do Vendedor)',
  'QUI (Dias do Vendedor)',
  'SEX (Dias do Vendedor)',
  'SAB (Dias do Vendedor)'
];

const novasLinhas = [novoHeader.join(',')];

// Processa cada cliente
for (let i = 1; i < linhas.length; i++) {
  const campos = linhas[i].split(';');
  
  // Extrai dados
  const cod = campos[0];
  const nome = campos[1];
  let lat = campos[2];
  let lon = campos[3];
  const tempo = campos[4];
  const freq = campos[5];
  
  // CORRIGE coordenada com erro (linha 28)
  if (lon === '-385972122') {
    lon = '-38.5972122';
    console.log(`✅ Corrigida coordenada da linha ${i + 1}: ${nome}`);
  }
  
  // Dias do vendedor (original - colunas 6-11)
  const diasVendedor = campos.slice(6, 12).map(d => d.trim() || '');
  
  // Dias DISPONÍVEIS do cliente (MESMO que vendedor)
  // Se vendedor já visita (X), cliente NÃO está disponível (X = bloqueado)
  // Se vendedor NÃO visita (vazio), cliente ESTÁ disponível (vazio = livre)
  // Parser lê: vazio = true, X = false
  const diasCliente = diasVendedor.map(d => d === 'X' ? 'X' : '');
  
  // Monta nova linha
  const novaLinha = [
    cod,
    `"${nome}"`, // nome entre aspas por causa de vírgulas
    lat,
    lon,
    tempo,
    freq,
    ...diasCliente, // dias disponíveis do cliente
    ...diasVendedor // dias do vendedor
  ].join(',');
  
  novasLinhas.push(novaLinha);
}

// Salva novo arquivo
const novoConteudo = novasLinhas.join('\n');
fs.writeFileSync('clientes_corrigido.csv', novoConteudo, 'utf8');

console.log(`\n✅ Arquivo corrigido salvo: clientes_corrigido.csv`);
console.log(`📊 Total de ${linhas.length - 1} clientes processados`);
console.log('\n🔧 Correções aplicadas:');
console.log('  ✓ Separador alterado de ; para ,');
console.log('  ✓ Adicionadas 6 colunas de dias disponíveis do cliente');
console.log('  ✓ Coordenada erro corrigida');
console.log('  ✓ Formato pronto para upload!');
