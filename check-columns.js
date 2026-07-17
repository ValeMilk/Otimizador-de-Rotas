const fs = require('fs');
const lines = fs.readFileSync('ejemplo_clientes.csv', 'utf-8').split('\n');
console.log('Header:', lines[0]);
console.log('\nVerifying columns (6=SEG, 7=TER, 8=QUA, 9=QUI, 10=SEX, 11=SAB):');
for (let i = 1; i <= 3; i++) {
  const parts = lines[i].split(',');
  console.log(`  Cliente ${i}: SEG=${parts[6]||'.'} TER=${parts[7]||'.'} QUA=${parts[8]||'.'} QUI=${parts[9]||'.'} SEX=${parts[10]||'.'} SAB=${parts[11]||'.'}`);
}

console.log('\nCounting availability by day:');
let availability = { seg: 0, ter: 0, qua: 0, qui: 0, sex: 0, sab: 0 };
for (let i = 1; i <= 81; i++) {
  const parts = lines[i].split(',');
  if (parts[6] === 'X') availability.seg++;
  if (parts[7] === 'X') availability.ter++;
  if (parts[8] === 'X') availability.qua++;
  if (parts[9] === 'X') availability.qui++;
  if (parts[10] === 'X') availability.sex++;
  if (parts[11] === 'X') availability.sab++;
}
console.log('SEG:', availability.seg);
console.log('TER:', availability.ter);
console.log('QUA:', availability.qua);
console.log('QUI:', availability.qui);
console.log('SEX:', availability.sex);
console.log('SAB:', availability.sab);
console.log('TOTAL:', Object.values(availability).reduce((a,b) => a+b));
