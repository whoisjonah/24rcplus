const fs = require('fs');
const path = require('path');

// Iteration parameters: small rotation + translate right/down, slightly reduce scale
const a = 1.03;
const b = -0.02;
const c = 0.02;
const d = 1.03;
const tx = 2000;
const ty = 3000;

const filePath = path.resolve(__dirname, '../src/data/Fixes.json');
const raw = fs.readFileSync(filePath, 'utf8');
const obj = JSON.parse(raw);

if (!Array.isArray(obj.fixes)) {
  console.error('No fixes array found');
  process.exit(1);
}

obj.fixes = obj.fixes.map(f => {
  const x = f.x;
  const y = f.y;
  const nx = Math.round(a * x + b * y + tx);
  const ny = Math.round(c * x + d * y + ty);
  return { ...f, x: nx, y: ny };
});

fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
console.log(`Applied iterative affine transform: a=${a}, b=${b}, c=${c}, d=${d}, tx=${tx}, ty=${ty}`);
console.log('Wrote', filePath);
console.log('Sample:');
console.log(JSON.stringify(obj.fixes.slice(0,8), null, 2));
