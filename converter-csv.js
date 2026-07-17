#!/usr/bin/env node
/**
 * CONVERSOR DE CSV: Formato simples → Formato com dias corretos
 * 
 * Entradas:
 * - CSV original: SEG, TER, QUA, etc (marca X = disponível)
 * 
 * Saída:
 * - CSV convertido: SEG (Dias do Cliente), TER (Dias do Cliente), ...
 *                   SEG (Dias do Vendedor), TER (Dias do Vendedor), ...
 * 
 * REGRA DE CONVERSÃO:
 * - Se coluna marcada com X → "(Dias do Vendedor)" recebe X (bloqueado)
 * - "(Dias do Cliente)" fica em branco (disponível)
 * - Se NENHUM dia marcado → todas as "(Dias do Cliente)" vazias = disponível seg-sex
 */

const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2] || './ejemplo_clientes.csv';
const outputFile = process.argv[3] || './ejemplo_clientes_CONVERTIDO.csv';

console.log(`\n📥 Lendo: ${inputFile}`);
const csv = fs.readFileSync(inputFile, 'utf-8');
const { data, errors } = Papa.parse(csv, { header: true, skipEmptyLines: true });

// Ignorar erros de field mismatch (linhas vazias ou incompletas)
const errosGraves = errors.filter(e => e.code !== 'TooFewFields');
if (errosGraves.length > 0) {
  console.warn('⚠️ Avisos ao parsear CSV:', errosGraves);
}

// Mapeamento simples: SEG→0, TER→1, QUA→2, etc
const diasMap = {
  'SEG': 'monday',
  'TER': 'tuesday',
  'QUA': 'wednesday',
  'QUI': 'thursday',
  'SEX': 'friday',
  'SAB': 'saturday',
};

// Nova estrutura de colunas
const novasColunas = [
  'CÓD',
  'NOME FANTASIA',
  'LATITUDE',
  'LONGITUDE',
  'TEMPO MÉDIO DE VISITA',
  'FREQUÊNCIA',
  'SEG (Dias do Cliente)',
  'TER (Dias do Cliente)',
  'QUA (Dias do Cliente)',
  'QUI (Dias do Cliente)',
  'SEX (Dias do Cliente)',
  'SAB (Dias do Cliente)',
  'SEG (Dias do Vendedor)',
  'TER (Dias do Vendedor)',
  'QUA (Dias do Vendedor)',
  'QUI (Dias do Vendedor)',
  'SEX (Dias do Vendedor)',
  'SAB (Dias do Vendedor)',
  'ROTAS',
];

// Converter cada linha
const novasLinhas = data.map((row, idx) => {
  const novaLinha = {};
  
  // Copiar campos básicos
  novaLinha['CÓD'] = row['CÓD'] || '';
  novaLinha['NOME FANTASIA'] = row['NOME FANTASIA'] || '';
  novaLinha['LATITUDE'] = row['LATITUDE'] || '';
  novaLinha['LONGITUDE'] = row['LONGITUDE'] || '';
  novaLinha['TEMPO MÉDIO DE VISITA'] = row['TEMPO MÉDIO DE VISITA'] || '00:30:00';
  novaLinha['FREQUÊNCIA'] = row['FREQUÊNCIA'] || '1';
  novaLinha['ROTAS'] = row['ROTAS'] || row['ROTA'] || 'DEFAULT';
  
  // Verificar quais dias estão marcados no CSV original
  const diasMarcados = {};
  Object.keys(diasMap).forEach(dia => {
    diasMarcados[dia] = !!row[dia]; // true se tem X/valor
  });
  
  // Se nenhum dia marcado, deixar disponível seg-sex
  const temDiasMarcados = Object.values(diasMarcados).some(v => v);
  
  // REGRA DE CONVERSÃO:
  // "(Dias do Cliente)" - MARCA COM X = disponível para visitar
  // "(Dias do Vendedor)" - MARCA COM X = bloqueado (promotor já visita)
  // 
  // CSV original: se tem X = era bloqueado do promoter
  Object.keys(diasMap).forEach(dia => {
    const coloniaCliente = `${dia} (Dias do Cliente)`;
    const coloniaVendedor = `${dia} (Dias do Vendedor)`;
    
    // Dias do Cliente: marca com X se NÃO estava bloqueado no original (= disponível)
    novaLinha[coloniaCliente] = diasMarcados[dia] ? '' : 'X';
    
    // Dias do Vendedor: marca X se estava bloqueado no original
    novaLinha[coloniaVendedor] = diasMarcados[dia] ? 'X' : '';
  });
  
  return novaLinha;
});

// Exportar novo CSV
const csvSaida = Papa.unparse(novasLinhas, { header: true });
fs.writeFileSync(outputFile, csvSaida, 'utf-8');

console.log(`\n✅ Arquivo convertido: ${outputFile}`);
console.log(`\n📊 Resumo:`);
console.log(`   - Total de linhas: ${novasLinhas.length}`);
console.log(`   - Colunas antigas: ${Object.keys(data[0] || {}).length}`);
console.log(`   - Colunas novas: ${novasColunas.length}`);

// Mostrar exemplo de conversão
const primeiroCliente = novasLinhas[0];
if (primeiroCliente) {
  console.log(`\n🔍 Exemplo (primeiro cliente):`);
  console.log(`   Nome: ${primeiroCliente['NOME FANTASIA']}`);
  console.log(`   Frequência: ${primeiroCliente['FREQUÊNCIA']}`);
  
  const diasVendedor = [];
  Object.keys(diasMap).forEach(dia => {
    const col = `${dia} (Dias do Vendedor)`;
    if (primeiroCliente[col]) diasVendedor.push(dia);
  });
  console.log(`   Dias bloqueados (Vendedor): ${diasVendedor.length > 0 ? diasVendedor.join(', ') : 'Nenhum'}`);
}

console.log(`\n💡 PRÓXIMOS PASSOS:`);
console.log(`   1. Faça upload de "${outputFile}" no app`);
console.log(`   2. Verifique se cada cliente com freq=2 recebe EXATAMENTE 2 visitas`);
console.log(`   3. Confirme que dias bloqueados não recebem visitas`);
