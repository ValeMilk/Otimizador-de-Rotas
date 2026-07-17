#!/usr/bin/env node
/**
 * CONVERSOR ROBUSTO: CSV simples → CSV com colunas (Dias do Cliente) e (Dias do Vendedor)
 * 
 * CSV Original: CÓD, NOME, LAT, LONG, TEMPO, FREQ, SEG, TER, QUA, QUI, SEX, SAB
 *   Se X = bloqueado (dia do vendedor já visita)
 * 
 * CSV Novo: CÓD, NOME, LAT, LONG, TEMPO, FREQ, 
 *   SEG(Cliente), TER(Cliente), ..., SEG(Vendedor), TER(Vendedor), ...
 *   Marca com X = disponível EM "Cliente", marca com X = bloqueado EM "Vendedor"
 */

const fs = require('fs');
const readline = require('readline');

const inputFile = process.argv[2] || './ejemplo_clientes.csv';
const outputFile = process.argv[3] || './ejemplo_clientes_FINAL.csv';

// Map de dias
const diasOrdem = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

console.log(`\n📥 Lendo: ${inputFile}`);

// Ler linha por linha
const rl = readline.createInterface({
  input: fs.createReadStream(inputFile),
  crlfDelay: Infinity,
});

let headerLine = null;
let headerFields = [];
let linhas = [];
let numLinhas = 0;

rl.on('line', (line) => {
  numLinhas++;
  
  if (numLinhas === 1) {
    // Salvar header
    headerLine = line;
    headerFields = line.split(',');
    return;
  }
  
  // Parse linha com split simples (cuidado com quoted fields)
  linhas.push(line);
});

rl.on('close', () => {
  console.log(`✅ Arquivo lido: ${numLinhas} linhas (1 header + ${linhas.length} dados)`);
  
  // Encontrar índices das colunas
  const indices = {};
  diasOrdem.forEach(dia => {
    indices[dia] = headerFields.indexOf(dia);
  });
  
  const idxCod = headerFields.indexOf('CÓD');
  const idxNome = headerFields.indexOf('NOME FANTASIA');
  const idxLat = headerFields.indexOf('LATITUDE');
  const idxLong = headerFields.indexOf('LONGITUDE');
  const idxTempo = headerFields.indexOf('TEMPO MÉDIO DE VISITA');
  const idxFreq = headerFields.indexOf('FREQUÊNCIA');
  const idxRotas = headerFields.indexOf('ROTAS') >= 0 ? headerFields.indexOf('ROTAS') : headerFields.indexOf('ROTA');
  
  console.log(`\n🔍 Índices encontrados:`);
  console.log(`   CÓD=${idxCod}, NOME=${idxNome}, FREQ=${idxFreq}`);
  diasOrdem.forEach(dia => {
    console.log(`   ${dia}=${indices[dia]}`);
  });
  
  // Montar novo header
  const novoHeader = [
    'CÓD',
    'NOME FANTASIA',
    'LATITUDE',
    'LONGITUDE',
    'TEMPO MÉDIO DE VISITA',
    'FREQUÊNCIA',
    'ROTAS',
    ...diasOrdem.map(d => `${d} (Dias do Cliente)`),
    ...diasOrdem.map(d => `${d} (Dias do Vendedor)`),
  ];
  
  // Processar cada linha
  const novasLinhas = linhas.map((line, idx) => {
    const fields = line.split(',');
    
    const novosFields = [
      fields[idxCod] || '',
      fields[idxNome] || '',
      fields[idxLat] || '',
      fields[idxLong] || '',
      fields[idxTempo] || '00:30:00',
      fields[idxFreq] || '1',
      fields[idxRotas] || 'DEFAULT',
    ];
    
    // Processar dias
    diasOrdem.forEach(dia => {
      const idxDia = indices[dia];
      const temMarca = idxDia >= 0 && fields[idxDia] && fields[idxDia].trim();
      
      // "Dias do Cliente" = X se NÃO está bloqueado
      novosFields.push(temMarca ? '' : 'X');
    });
    
    // "Dias do Vendedor" = X se está bloqueado
    diasOrdem.forEach(dia => {
      const idxDia = indices[dia];
      const temMarca = idxDia >= 0 && fields[idxDia] && fields[idxDia].trim();
      novosFields.push(temMarca ? 'X' : '');
    });
    
    return novosFields.map(f => `"${f}"`).join(',');
  });
  
  // Escrever arquivo
  const csvSaida = [
    novoHeader.map(h => `"${h}"`).join(','),
    ...novasLinhas,
  ].join('\n');
  
  fs.writeFileSync(outputFile, csvSaida, 'utf-8');
  
  console.log(`\n✅ Arquivo gerado: ${outputFile}`);
  console.log(`   Linhas: ${novasLinhas.length}`);
  console.log(`   Colunas: ${novoHeader.length}`);
  
  // Amostra
  if (novasLinhas.length > 0) {
    const primeira = novasLinhas[0].split(',');
    console.log(`\n🔍 Primeira linha (exemplo):`);
    primeira.forEach((f, i) => {
      if (i < 7) console.log(`   [${i}] ${novoHeader[i]}: ${f}`);
    });
  }
});

rl.on('error', (err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
