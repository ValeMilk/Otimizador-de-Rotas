const fs = require('fs');

const arquivo = 'auto_servico_2026_corrigido.csv';
const conteudo = fs.readFileSync(arquivo, 'utf-8');
const linhas = conteudo.split('\n');

console.log(`\n🔍 Validando coordenadas de "${arquivo}"...\n`);

let erros = [];
let corrigidas = 0;
let novasLinhas = [linhas[0]]; // Cabeçalho

for (let i = 1; i < linhas.length; i++) {
  const linha = linhas[i].trim();
  if (!linha) continue;

  const campos = linha.split(',');
  if (campos.length < 4) continue;

  let lat = campos[2].trim();
  let lng = campos[3].trim();
  
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  // Latitude Brasil: -35 a 5
  if (Math.abs(latNum) > 90 || Math.abs(latNum) < 0.1) {
    // Provavelmente falta o ponto decimal (ex: -3800000 → -3.800000)
    if (Math.abs(latNum) > 1) {
      const latCorrigida = latNum / 10000000; // Divide para inserir ponto após 1 dígito
      erros.push(`Linha ${i+1}: ${campos[1]} - LAT ${lat} → ${latCorrigida.toFixed(7)}`);
      campos[2] = latCorrigida.toFixed(7);
      corrigidas++;
    }
  }

  // Longitude Brasil: -75 a -30
  if (Math.abs(lngNum) > 180 || Math.abs(lngNum) < 0.1) {
    if (Math.abs(lngNum) > 1) {
      // Determina onde vai o ponto (formato -38.xxxxx)
      const lngStr = lng.replace('-', '');
      let lngCorrigida;
      if (lngStr.length > 2) {
        lngCorrigida = -parseFloat(lngStr.substring(0, 2) + '.' + lngStr.substring(2));
      } else {
        lngCorrigida = lngNum;
      }
      erros.push(`Linha ${i+1}: ${campos[1]} - LNG ${lng} → ${lngCorrigida.toFixed(7)}`);
      campos[3] = lngCorrigida.toFixed(7);
      corrigidas++;
    }
  }
  
  // Remove "..." se existir
  if (campos[3].includes('...')) {
    campos[3] = campos[3].replace(/\.\.\./g, '');
    erros.push(`Linha ${i+1}: ${campos[1]} - Removido "..." de LNG`);
    corrigidas++;
  }

  novasLinhas.push(campos.join(','));
}

if (erros.length > 0) {
  console.log(`⚠️ ${erros.length} problema(s) encontrado(s):\n`);
  erros.forEach(e => console.log(`  ${e}`));
  
  fs.writeFileSync(arquivo, novasLinhas.join('\n'), 'utf-8');
  console.log(`\n✅ Arquivo "${arquivo}" corrigido!`);
} else {
  console.log('✅ Todas as coordenadas estão válidas!');
}

console.log(`\n📊 Total de linhas: ${linhas.length - 1}`);
console.log(`🔧 Coordenadas corrigidas: ${corrigidas}`);
