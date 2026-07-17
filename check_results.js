// Script to check if optimization results are stored somewhere
const fs = require('fs');
const path = require('path');

// Check for recent Excel exports
const publicDir = 'C:\\Users\\LUCAS CACAU\\Downloads';

try {
  const files = fs.readdirSync(publicDir)
    .filter(f => f.includes('Rotas_Otimizadas') || f.includes('rotas') || f.endsWith('.xlsx'))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(publicDir, a));
      const statB = fs.statSync(path.join(publicDir, b));
      return statB.mtime - statA.mtime; // Most recent first
    });

  console.log('Recent files in Downloads:');
  files.slice(0, 10).forEach(f => {
    const stat = fs.statSync(path.join(publicDir, f));
    console.log('  ' + f + ' (' + new Date(stat.mtime).toLocaleTimeString() + ')');
  });
} catch (e) {
  console.log('Error reading Downloads:', e.message);
}
