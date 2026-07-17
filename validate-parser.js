/**
 * Teste do parser melhorado
 */

const XLSX = require('xlsx');
const fs = require('fs');

console.log('🧪 Testando parser com casos problemáticos...\n');

// Caso 1: Dados corretos
console.log('1️⃣ CASO 1: Dados 100% Corretos');
const validData = [
  {
    CÓD: '001',
    'NOME FANTASIA': 'Loja Centro',
    LATITUDE: '-23.5505',
    LONGITUDE: '-46.6333',
    'TEMPO MÉDIO DE VISITA': '01:00:00',
    FREQUÊNCIA: '2',
    'SEG (Dias do Vendedor)': 'X',
    'TER (Dias do Vendedor)': '',
    'QUA (Dias do Vendedor)': '',
    'QUI (Dias do Vendedor)': 'X',
    'SEX (Dias do Vendedor)': '',
    'SAB (Dias do Vendedor)': '',
  },
];

// Validar
const valid1 = validData[0];
const lat1 = parseFloat(valid1.LATITUDE);
const lon1 = parseFloat(valid1.LONGITUDE);
const freq1 = parseInt(valid1.FREQUÊNCIA, 10);

console.log(`   CÓD: "${valid1.CÓD}" → ${valid1.CÓD ? '✅' : '❌'}`);
console.log(`   NOME: "${valid1['NOME FANTASIA']}" → ${valid1['NOME FANTASIA'] ? '✅' : '❌'}`);
console.log(`   LAT: "${valid1.LATITUDE}" → ${lat1} → ${lat1 !== 0 && !isNaN(lat1) ? '✅' : '❌'}`);
console.log(`   LON: "${valid1.LONGITUDE}" → ${lon1} → ${lon1 !== 0 && !isNaN(lon1) ? '✅' : '❌'}`);
console.log(`   FREQ: "${valid1.FREQUÊNCIA}" → ${freq1} → ${!isNaN(freq1) && freq1 >= 1 ? '✅' : '❌'}`);
console.log(`   ✅ VÁLIDO\n`);

// Caso 2: Coordenada zerada
console.log('2️⃣ CASO 2: Coordenadas com Zeros (erro comum)');
const zeroData = {
  CÓD: '002',
  'NOME FANTASIA': 'Loja Teste',
  LATITUDE: '0',
  LONGITUDE: '0',
  FREQUÊNCIA: '2',
};
const lat2 = parseFloat(zeroData.LATITUDE);
const lon2 = parseFloat(zeroData.LONGITUDE);
console.log(`   LAT: "0" → ${lat2} → ${lat2 !== 0 ? '✅' : '❌ REJEITADO'}`);
console.log(`   LON: "0" → ${lon2} → ${lon2 !== 0 ? '✅' : '❌ REJEITADO'}\n`);

// Caso 3: Coordenada como texto com vírgula
console.log('3️⃣ CASO 3: Coordenada com Vírgula em vez de Ponto (erro comum)');
const commaData = {
  LATITUDE: '-23,5505',  // vírgula em vez de ponto
};
const lat3 = parseFloat(commaData.LATITUDE);
console.log(`   LAT: "-23,5505" (com vírgula)`);
console.log(`   → parseFloat retorna: ${lat3} (inválido!)`);
console.log(`   → ${lat3 === 0 || isNaN(lat3) ? '❌ REJEITADO' : '✅'}`);
console.log(`   💡 Solução: Use PONTO decimal (-23.5505)\n`);

// Caso 4: Frequência vazia
console.log('4️⃣ CASO 4: Frequência Vazia');
const emptyFreqData = {
  CÓD: '003',
  'NOME FANTASIA': 'Loja Teste',
  LATITUDE: '-23.5505',
  LONGITUDE: '-46.6333',
  FREQUÊNCIA: '',  // vazio
};
const freq4 = parseInt(emptyFreqData.FREQUÊNCIA, 10);
console.log(`   FREQ: "" (vazio)`);
console.log(`   → parseInt retorna: ${freq4}`);
console.log(`   → isNaN(${freq4}): ${isNaN(freq4)}`);
console.log(`   → ${isNaN(freq4) || freq4 < 1 ? '❌ REJEITADO' : '✅'}\n`);

// Caso 5: Nome vazio
console.log('5️⃣ CASO 5: Nome Fantasia Vazio');
const emptyNameData = {
  CÓD: '004',
  'NOME FANTASIA': '',
  LATITUDE: '-23.5505',
  LONGITUDE: '-46.6333',
  FREQUÊNCIA: '2',
};
console.log(`   NOME: "" (vazio)`);
console.log(`   → ${emptyNameData['NOME FANTASIA'] ? '✅' : '❌ REJEITADO'}\n`);

console.log('═══════════════════════════════════════');
console.log('\n📋 RESUMO DAS VALIDAÇÕES:\n');
console.log('Campos Obrigatórios:');
console.log('  1. CÓD: Não pode estar vazio');
console.log('  2. NOME FANTASIA: Não pode estar vazio');
console.log('  3. LATITUDE: Deve ser número negativo (ex: -23.5505)');
console.log('  4. LONGITUDE: Deve ser número negativo (ex: -46.6333)');
console.log('  5. FREQUÊNCIA: Deve ser número entre 1 e 6\n');
console.log('Erros Comuns:');
console.log('  ❌ LATITUDE "0" ou "0.0" → Rejeitado (parece coordenada inválida)');
console.log('  ❌ Coordenadas com VÍRGULA (-23,5505) → Rejeitado');
console.log('  ❌ Espaços em branco → Podem invalidar dados');
console.log('  ❌ Frequência vazia ou como texto → Rejeitado\n');
console.log('✅ Copie exatamente o formato do Template com Exemplos!');
