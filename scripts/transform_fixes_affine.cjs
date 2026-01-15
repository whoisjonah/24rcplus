const fs = require('fs');
const path = require('path');

// Affine transform parameters
// x' = a*x + b*y + tx
// y' = c*x + d*y + ty
const a = 1.04936; // scale*cos(theta)
const b = -0.03664; // -scale*sin(theta)
const c = 0.03664;  // scale*sin(theta)
const d = 1.04936; // scale*cos(theta)
const tx = -2800;  // translate x
const ty = -2100;  // translate y

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
console.log(`Applied affine transform: a=${a}, b=${b}, c=${c}, d=${d}, tx=${tx}, ty=${ty}`);
console.log('Wrote', filePath);
console.log('Sample:');
console.log(JSON.stringify(obj.fixes.slice(0,8), null, 2));
