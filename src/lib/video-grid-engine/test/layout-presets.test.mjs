import { hasPreset, getPresetLayout } from '../src/LayoutPresets.js';

function check(count, w, h) {
  if (!hasPreset(count)) { console.log(`n=${count} no preset, skip`); return; }
  const positions = getPresetLayout(count, { containerWidth: w, containerHeight: h, aspectRatio: 16/9, gap: 8 });
  console.log(`n=${count} ${w}x${h} -> ${positions.length} tiles`);
  if (positions.length !== count) throw new Error(`MISMATCH n=${count} got ${positions.length}`);
  for (const p of positions) {
    if (p.x < -0.5 || p.y < -0.5 || p.x + p.width > w + 0.5 || p.y + p.height > h + 0.5) {
      throw new Error(`OUT OF BOUNDS n=${count}: ${JSON.stringify(p)}`);
    }
    if (p.width <= 0 || p.height <= 0) throw new Error(`ZERO SIZE TILE n=${count}: ${JSON.stringify(p)}`);
  }
  // check indices are 0..count-1 unique
  const idxs = positions.map(p => p.index).sort((a,b)=>a-b);
  for (let i = 0; i < count; i++) if (idxs[i] !== i) throw new Error(`BAD INDEX SET n=${count}: ${idxs}`);
}

for (let n = 1; n <= 6; n++) {
  check(n, 1280, 720); // landscape
  check(n, 600, 1000); // portrait
  check(n, 1000, 1000); // square
}
console.log("ALL PRESET TESTS OK");
