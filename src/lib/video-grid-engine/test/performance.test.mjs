import VideoGridEngine from '../src/VideoGridEngine.js';
const engine = new VideoGridEngine();

for (const n of [10, 100, 500, 1000, 5000]) {
  const start = performance.now();
  const r = engine.calculateLayout({ participantCount: n, containerWidth: 1920, containerHeight: 1080 });
  const elapsed = performance.now() - start;
  console.log(`n=${n}: ${elapsed.toFixed(3)}ms, positions=${r.positions.length}, tile=${r.tileWidth.toFixed(1)}x${r.tileHeight.toFixed(1)}`);
}
