const fs = require('fs');
const path = require('path');

// Parameters: adjust these to tweak placement
const SCALE = 1.05; // multiply coordinates by this
const OFFSET_X = -3000; // then add this to x
const OFFSET_Y = -2000; // then add this to y

const filePath = path.resolve(__dirname, '../src/data/Fixes.json');
const raw = fs.readFileSync(filePath, 'utf8');
const obj = JSON.parse(raw);

if (!Array.isArray(obj.fixes)) {
  console.error('No fixes array found');
  process.exit(1);
}

obj.fixes = obj.fixes.map(f => ({
  ...f,
  x: Math.round((f.x * SCALE) + OFFSET_X),
  y: Math.round((f.y * SCALE) + OFFSET_Y),
}));

fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
console.log(`Applied transform: scale=${SCALE}, offsetX=${OFFSET_X}, offsetY=${OFFSET_Y}`);
console.log('Wrote', filePath);
// print first 8 entries as sample
console.log(JSON.stringify(obj.fixes.slice(0,8), null, 2));
