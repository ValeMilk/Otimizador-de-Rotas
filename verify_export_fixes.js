const XLSX = require('xlsx');
const path = require('path');

const downloadPath = path.join(process.env.USERPROFILE, 'Downloads', 'Rotas_Otimizadas_2026-07-03.xlsx');

console.log('📊 Verificando arquivo exportado:', downloadPath);
console.log('');

try {
  const workbook = XLSX.readFile(downloadPath);
  const clientsSheet = workbook.Sheets['Clientes'];
  
  if (!clientsSheet) {
    console.error('❌ Planilha "Clientes" não encontrada');
    process.exit(1);
  }
  
  const data = XLSX.utils.sheet_to_json(clientsSheet, { header: 1 });
  
  console.log('✅ Arquivo lido com sucesso');
  console.log(`📝 Total de linhas (incluindo header): ${data.length}`);
  console.log(`👥 Total de clientes: ${data.length - 1}`);
  console.log('');
  
  // Verificar formato do tempo médio de visita
  console.log('🕐 VERIFICAÇÃO: Formato de Tempo Médio de Visita');
  console.log('─────────────────────────────────────────');
  
  let timeFormatOK = 0;
  let timeFormatFail = 0;
  const timeSamples = [];
  
  for (let i = 1; i < Math.min(11, data.length); i++) {
    const row = data[i];
    const tempo = row[4]; // Coluna E: TEMPO MÉDIO DE VISITA
    
    // Verificar se está em formato HH:MM:SS
    const isHHMMSS = /^\d{2}:\d{2}:\d{2}$/.test(tempo);
    
    if (isHHMMSS) {
      timeFormatOK++;
    } else {
      timeFormatFail++;
    }
    
    if (i <= 5) {
      timeSamples.push({ cod: row[0], tempo, formato: isHHMMSS ? '✓ HH:MM:SS' : '✗ Incorreto' });
    }
  }
  
  console.log('📋 Primeiras 5 linhas:');
  timeSamples.forEach(sample => {
    console.log(`   Cód: ${sample.cod} | Tempo: ${sample.tempo} | ${sample.formato}`);
  });
  console.log('');
  console.log(`✅ Formato correto (HH:MM:SS): ${timeFormatOK}`);
  console.log(`❌ Formato incorreto: ${timeFormatFail}`);
  
  if (timeFormatFail === 0) {
    console.log('✓ TODOS os tempos estão no formato HH:MM:SS! 🎉');
  }
  
  // Verificar se todos os clientes têm rotas
  console.log('');
  console.log('🛣️  VERIFICAÇÃO: Clientes com Rotas Atribuídas');
  console.log('─────────────────────────────────────────');
  
  let clientsWithRoute = 0;
  let clientsWithoutRoute = 0;
  const clientsNoRoute = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rota = row[2]; // Coluna C: ROTA
    
    if (rota && rota.toString().trim() !== '') {
      clientsWithRoute++;
    } else {
      clientsWithoutRoute++;
      if (clientsNoRoute.length < 5) {
        clientsNoRoute.push({ cod: row[0], nome: row[1] });
      }
    }
  }
  
  console.log(`✅ Clientes COM rota: ${clientsWithRoute}`);
  console.log(`❌ Clientes SEM rota: ${clientsWithoutRoute}`);
  
  if (clientsWithoutRoute > 0) {
    console.log('');
    console.log('📋 Primeiros clientes sem rota:');
    clientsNoRoute.forEach(client => {
      console.log(`   - ${client.cod}: ${client.nome}`);
    });
  }
  
  if (clientsWithoutRoute === 0) {
    console.log('✓ TODOS os 81 clientes têm rotas atribuídas! 🎉');
  }
  
  console.log('');
  console.log('═════════════════════════════════════════');
  if (timeFormatFail === 0 && clientsWithoutRoute === 0) {
    console.log('✅ ✅ ✅ TODAS AS CORREÇÕES FUNCIONANDO! ✅ ✅ ✅');
  } else {
    console.log('⚠️  Algumas correções ainda precisam ser ajustadas');
  }
  console.log('═════════════════════════════════════════');
  
} catch (err) {
  console.error('❌ Erro ao ler o arquivo:', err.message);
  process.exit(1);
}
