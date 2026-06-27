import VideoGridEngine from '../src/VideoGridEngine.js';

let failures = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); failures++; }
}

function checkBounds(positions, w, h, label) {
  for (const p of positions) {
    assert(p.x >= -0.6 && p.y >= -0.6 && p.x + p.width <= w + 0.6 && p.y + p.height <= h + 0.6,
      `${label}: out of bounds ${JSON.stringify(p)}`);
    assert(p.width > 0 && p.height > 0, `${label}: zero/negative size ${JSON.stringify(p)}`);
    assert(p.participantId !== undefined, `${label}: missing participantId`);
  }
}

// 1. GRID MODE across counts 1..30 and a big one
{
  const engine = new VideoGridEngine({ gap: 8 });
  for (const n of [1,2,3,4,5,6,7,10,13,20,30,77,150]) {
    const r = engine.calculateLayout({ participantCount: n, containerWidth: 1366, containerHeight: 768 });
    assert(r.positions.length === n, `grid n=${n}: expected ${n} positions got ${r.positions.length}`);
    checkBounds(r.positions, 1366, 768, `grid n=${n}`);
    // unique participantIds
    const ids = new Set(r.positions.map(p => p.participantId));
    assert(ids.size === n, `grid n=${n}: duplicate participantIds`);
  }
  console.log("Grid mode: OK across counts");
}

// 2. Empty / zero participants
{
  const engine = new VideoGridEngine();
  const r = engine.calculateLayout({ participantCount: 0, containerWidth: 800, containerHeight: 600 });
  assert(r.positions.length === 0, "zero participants should yield empty positions");
  console.log("Zero participants: OK");
}

// 3. Zero-size container
{
  const engine = new VideoGridEngine();
  const r = engine.calculateLayout({ participantCount: 5, containerWidth: 0, containerHeight: 600 });
  assert(r.positions.length === 0, "zero width container should yield empty result, not crash");
  console.log("Zero-size container: OK (no crash)");
}

// 4. SPEAKER MODE
{
  const engine = new VideoGridEngine();
  engine.setLayoutMode('speaker');
  const participants = Array.from({length: 6}, (_, i) => ({ id: `p${i}`, isActiveSpeaker: i === 3 }));
  const r = engine.calculateLayout({ participants, containerWidth: 1280, containerHeight: 720 });
  assert(r.mainParticipantId === 'p3', `speaker mode should pick active speaker p3, got ${r.mainParticipantId}`);
  assert(r.positions.length === 6, `speaker mode: expected 6 positions got ${r.positions.length}`);
  if (!r.isOverflowing) checkBounds(r.positions, 1280, 720, "speaker");
  console.log("Speaker mode: OK, main =", r.mainParticipantId);
}

// 4b. SPEAKER MODE stress: many "others" should overflow gracefully, not shrink to illegibility
{
  const engine = new VideoGridEngine();
  engine.setLayoutMode('speaker');
  const participants = Array.from({length: 40}, (_, i) => ({ id: `p${i}`, isActiveSpeaker: i === 0 }));
  const r = engine.calculateLayout({ participants, containerWidth: 1280, containerHeight: 720 });
  assert(r.positions.length === 40, `speaker stress: expected 40 positions got ${r.positions.length}`);
  const thumbs = r.positions.slice(1); // exclude main tile
  const minThumbWidth = Math.min(...thumbs.map(p => p.width));
  assert(minThumbWidth > 10, `speaker stress: thumbnails should not shrink to illegibility, got width=${minThumbWidth}`);
  if (r.isOverflowing) {
    assert(typeof r.scrollExtent === 'number' && r.scrollExtent > 0, "overflowing speaker strip must report scrollExtent");
  }
  console.log("Speaker mode stress (40 participants): OK, isOverflowing =", r.isOverflowing, "minThumbWidth =", minThumbWidth.toFixed(1));
}
{
  const engine = new VideoGridEngine();
  engine.setLayoutMode('speaker');
  engine.setPinnedParticipant('p1');
  const participants = Array.from({length: 5}, (_, i) => ({ id: `p${i}`, isActiveSpeaker: i === 3 }));
  const r = engine.calculateLayout({ participants, containerWidth: 1280, containerHeight: 720 });
  assert(r.mainParticipantId === 'p1', `pin should override active speaker, got ${r.mainParticipantId}`);
  console.log("Pinning: OK, main =", r.mainParticipantId);
}

// 6. PRESENTATION MODE (screen share priority over pin? -- screenshare should still lose to explicit pin per our priority: pin > screenshare > speaker)
{
  const engine = new VideoGridEngine();
  engine.setLayoutMode('presentation');
  const participants = [
    { id: 'a', isScreenSharing: true },
    { id: 'b', isActiveSpeaker: true },
    { id: 'c' },
  ];
  const r = engine.calculateLayout({ participants, containerWidth: 1280, containerHeight: 720 });
  assert(r.mainParticipantId === 'a', `presentation mode should pick screen-sharer, got ${r.mainParticipantId}`);
  assert(r.mode === 'presentation', "mode label should be presentation");
  checkBounds(r.positions, 1280, 720, "presentation");
  console.log("Presentation mode: OK, main =", r.mainParticipantId);
}

// 7. FILMSTRIP MODE landscape + portrait (small counts: must fit; large counts: must report overflow honestly)
{
  const engine = new VideoGridEngine();
  engine.setLayoutMode('filmstrip');

  // Small count: should fit within bounds, no overflow.
  const rSmall = engine.calculateLayout({ participantCount: 4, containerWidth: 1280, containerHeight: 720 });
  checkBounds(rSmall.positions, 1280, 720, "filmstrip landscape (small)");
  assert(rSmall.isOverflowing === false, "small filmstrip should not overflow");

  // Large count in landscape: engine should EITHER shrink to fit OR
  // explicitly flag isOverflowing+scrollExtent -- never silently exceed bounds.
  const rBig = engine.calculateLayout({ participantCount: 10, containerWidth: 1280, containerHeight: 720 });
  if (!rBig.isOverflowing) {
    checkBounds(rBig.positions, 1280, 720, "filmstrip landscape (big, claims no overflow)");
  } else {
    assert(typeof rBig.scrollExtent === 'number' && rBig.scrollExtent > 0, "overflowing filmstrip must report scrollExtent");
    // last tile's right edge should roughly match scrollExtent
    const lastTile = rBig.positions[rBig.positions.length - 1];
    assert(Math.abs((lastTile.x + lastTile.width) - rBig.scrollExtent) < 1, "scrollExtent should match strip end");
  }
  assert(rBig.rows === 1, "landscape filmstrip should be single row");

  const r2 = engine.calculateLayout({ participantCount: 10, containerWidth: 500, containerHeight: 1000 });
  if (!r2.isOverflowing) {
    checkBounds(r2.positions, 500, 1000, "filmstrip portrait");
  }
  assert(r2.columns === 1, "portrait filmstrip should be single column");
  console.log("Filmstrip mode: OK landscape + portrait, overflow handled explicitly (rBig.isOverflowing =", rBig.isOverflowing + ")");
}

// 8. CACHING: identical calls should return same object reference (no recompute)
{
  const engine = new VideoGridEngine();
  const params = { participantCount: 4, containerWidth: 1000, containerHeight: 600 };
  const r1 = engine.calculateLayout(params);
  const r2 = engine.calculateLayout({ ...params });
  assert(r1 === r2, "identical requests should hit cache (same reference)");
  console.log("Caching: OK (same reference returned)");
}

// 9. Mode switch invalidates cache
{
  const engine = new VideoGridEngine();
  const params = { participantCount: 4, containerWidth: 1000, containerHeight: 600 };
  const r1 = engine.calculateLayout(params);
  engine.setLayoutMode('filmstrip');
  const r2 = engine.calculateLayout(params);
  assert(r1 !== r2, "mode switch should invalidate cache");
  assert(r2.mode === 'filmstrip', "result should reflect new mode");
  console.log("Mode-switch cache invalidation: OK");
}

// 10. onLayoutChange listener fires only on actual recompute
{
  const engine = new VideoGridEngine();
  let fireCount = 0;
  engine.onLayoutChange(() => fireCount++);
  const params = { participantCount: 4, containerWidth: 1000, containerHeight: 600 };
  engine.calculateLayout(params);
  engine.calculateLayout({ ...params }); // cached, should NOT refire
  engine.calculateLayout({ ...params, containerWidth: 1001 }); // changed, should fire
  assert(fireCount === 2, `expected 2 listener fires, got ${fireCount}`);
  console.log("Listener firing: OK, count =", fireCount);
}

// 11. resize() rAF coalescing (simulate multiple rapid calls)
{
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0); // polyfill for node test env
  const engine = new VideoGridEngine();
  let resolveCount = 0;
  const p1 = engine.resize({ participantCount: 4, containerWidth: 800, containerHeight: 600 }).then(() => resolveCount++);
  const p2 = engine.resize({ participantCount: 4, containerWidth: 900, containerHeight: 600 }).then(() => resolveCount++);
  Promise.all([p1, p2]).then(() => {
    assert(resolveCount === 2, "both resize promises should resolve");
    console.log("Resize coalescing: OK");
    console.log(failures === 0 ? "\nALL ENGINE TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
  });
}
