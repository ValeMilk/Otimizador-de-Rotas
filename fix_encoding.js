const fs = require('fs');

// Lê o arquivo corrompido
const arquivo = 'auto_servico_2026_corrigido.csv';
let conteudo = fs.readFileSync(arquivo, 'utf-8');

// Remove BOM se existir
if (conteudo.charCodeAt(0) === 0xFEFF) {
  conteudo = conteudo.substring(1);
}

// Corrige caracteres UTF-8 mal interpretados
const substituicoes = {
  'CÃ³D': 'CÓD',
  'CÃ"D': 'CÓD',
  'CÃD': 'CÓD',
  'MÃ‰DIO': 'MÉDIO',
  'FREQUÃŠNCIA': 'FREQUÊNCIA',
  'MÃ‰': 'MÉ',
  'ÃŠ': 'Ê',
  'Ã‰': 'É',
  'Ã"': 'Ó',
  'Ã': 'Á',
};

for (const [errado, correto] of Object.entries(substituicoes)) {
  conteudo = conteudo.split(errado).join(correto);
}

// Cabeçalho correto explicito 
const linhas = conteudo.split('\n');
linhas[0] = 'CÓD,NOME FANTASIA,LATITUDE,LONGITUDE,TEMPO MÉDIO DE VISITA,FREQUÊNCIA,SEG,TER,QUA,QUI,SEX,SAB,SEG (Dias do Vendedor),TER (Dias do Vendedor),QUA (Dias do Vendedor),QUI (Dias do Vendedor),SEX (Dias do Vendedor),SAB (Dias do Vendedor)';

const novoConteudo = linhas.join('\n');

// Salva com BOM UTF-8 (para Excel abrir corretamente)
fs.writeFileSync(arquivo, '\ufeff' + novoConteudo, 'utf-8');

console.log('✅ Arquivo corrigido!');
console.log(`📊 Total de linhas: ${linhas.length - 1}`);
console.log(`📝 Cabeçalho: ${linhas[0].substring(0, 80)}...`);
