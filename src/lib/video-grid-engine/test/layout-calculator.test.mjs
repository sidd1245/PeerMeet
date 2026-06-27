import { fitGridForCount } from '../src/LayoutCalculator.js';

function check(count, w, h) {
  const r = fitGridForCount({ count, containerWidth: w, containerHeight: h, aspectRatio: 16/9, gap: 8 });
  console.log(`n=${count} container=${w}x${h} -> rows=${r.rows} cols=${r.columns} tile=${r.tileWidth.toFixed(1)}x${r.tileHeight.toFixed(1)} positions=${r.positions.length} eff=${(r.efficiency*100).toFixed(1)}%`);
  if (r.positions.length !== count) throw new Error(`MISMATCH positions ${r.positions.length} vs count ${count}`);
  for (const p of r.positions) {
    if (p.x < -0.5 || p.y < -0.5 || p.x + p.width > w + 0.5 || p.y + p.height > h + 0.5) {
      throw new Error(`OUT OF BOUNDS for n=${count}: ${JSON.stringify(p)}`);
    }
  }
}

[1,2,3,4,5,6,7,8,9,10,11,13,17,25,49,50,100,101].forEach(n => check(n, 1280, 720));
check(5, 720, 1280);
check(13, 400, 800);
console.log("ALL OK");
