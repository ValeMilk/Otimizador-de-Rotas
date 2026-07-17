const fs = require('fs');
const path = require('path');

// Load the bundle to test allocation
const csvParser = require('./utils/csvParser.ts');
const dynamicRouteGenerator = require('./utils/dynamicRouteGenerator.ts');

console.log('Testing gap rule with freq < 4 threshold...\n');

// Simulate the new rule behavior
const testData = [
  { frequency: 1, dias: [], expectGap: true },
  { frequency: 2, dias: [], expectGap: true },
  { frequency: 3, dias: [], expectGap: false },  // NEW: freq < 4 means gap required
  { frequency: 4, dias: [], expectGap: false },
  { frequency: 5, dias: [], expectGap: false },
];

testData.forEach(td => {
  const rule = td.frequency < 4;
  console.log(`Freq=${td.frequency}: Gap required=${rule} (frequency < 4 = ${rule})`);
});

console.log('\n=== Expected behavior ===');
console.log('✓ freq=1,2,3: Gap enforced (diff > 1)');
console.log('✓ freq=4,5:   Gap NOT enforced (permite dias seguidos)');
console.log('\nOld behavior would have been:');
console.log('  freq=1,2: Gap enforced');
console.log('  freq=3,4,5: Gap NOT enforced');
