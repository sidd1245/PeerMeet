/**
 * vanilla-dom.js
 *
 * Reference implementation of a DOM renderer for VideoGridEngine output.
 * This is intentionally framework-free: it shows the minimum amount of
 * code needed to turn `layout.positions` into real DOM nodes, and is a
 * good template for the rendering layer of any custom integration
 * (including the React/Vue examples, which follow the same logic).
 *
 * Usage:
 *   <div id="call-container" style="width: 100vw; height: 100vh;"></div>
 *   <script type="module" src="vanilla-dom.js"></script>
 */

import VideoGridEngine from '../src/VideoGridEngine.js';

const container = document.getElementById('call-container');
container.classList.add('vge-container');

const engine = new VideoGridEngine({ aspectRatio: 16 / 9, gap: 8 });

/** In-memory participant list — replace with your real signaling state. */
let participants = [
  { id: 'local', isActiveSpeaker: false },
  { id: 'p1', isActiveSpeaker: true },
  { id: 'p2' },
  { id: 'p3' },
];

/** @type {Map<string, HTMLElement>} keep tile elements around so we only update style, never recreate nodes — this is what makes resize/recalculation cheap (no DOM thrashing). */
const tileElements = new Map();

/**
 * Reconciles the DOM to match a fresh layout result: creates elements
 * for new participants, removes elements for participants who left,
 * and updates style custom-properties (x/y/w/h) for everyone else.
 * @param {import('../src/VideoGridEngine.js').LayoutResult} layout
 */
function render(layout) {
  const seenIds = new Set();

  for (const pos of layout.positions) {
    seenIds.add(pos.participantId);

    let tile = tileElements.get(pos.participantId);
    if (!tile) {
      tile = createTileElement(pos.participantId);
      tileElements.set(pos.participantId, tile);
      container.appendChild(tile);
    }

    tile.classList.toggle('vge-tile--main', pos.participantId === layout.mainParticipantId);

    // Writing custom properties (not top/left) lets the CSS transition
    // pick them up smoothly via the `transform`/`width`/`height` rules
    // already defined in video-grid-engine.css.
    tile.style.setProperty('--vge-x', `${pos.x}px`);
    tile.style.setProperty('--vge-y', `${pos.y}px`);
    tile.style.setProperty('--vge-w', `${pos.width}px`);
    tile.style.setProperty('--vge-h', `${pos.height}px`);
  }

  // Remove tiles for participants no longer present.
  for (const [id, el] of tileElements) {
    if (!seenIds.has(id)) {
      el.remove();
      tileElements.delete(id);
    }
  }

  if (layout.isOverflowing) {
    container.classList.add('vge-container--scrollable');
  } else {
    container.classList.remove('vge-container--scrollable');
  }
}

/**
 * @param {string} participantId
 * @returns {HTMLElement}
 */
function createTileElement(participantId) {
  const el = document.createElement('div');
  el.className = 'vge-tile';
  el.dataset.participantId = participantId;

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = participantId === 'local';
  el.appendChild(video);

  const label = document.createElement('div');
  label.className = 'vge-tile-label';
  label.textContent = participantId;
  el.appendChild(label);

  // Wire up your actual MediaStream here, e.g.:
  // video.srcObject = streamsById.get(participantId);

  return el;
}

/**
 * Recompute and render using the engine's current container size.
 */
function relayout() {
  const layout = engine.calculateLayout({
    participants,
    containerWidth: container.clientWidth,
    containerHeight: container.clientHeight,
  });
  render(layout);
}

// Initial paint.
relayout();

// --- Responsive resizing ---
// ResizeObserver + engine.resize() (which is rAF-coalesced internally)
// is the recommended pattern: cheap, no thrashing, no polling.
const resizeObserver = new ResizeObserver(() => {
  engine
    .resize({
      participants,
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
    })
    .then(render);
});
resizeObserver.observe(container);

// --- Example: switching modes ---
// document.getElementById('grid-btn').onclick = () => { engine.setLayoutMode('grid'); relayout(); };
// document.getElementById('speaker-btn').onclick = () => { engine.setLayoutMode('speaker'); relayout(); };
// document.getElementById('presentation-btn').onclick = () => { engine.setLayoutMode('presentation'); relayout(); };
// document.getElementById('filmstrip-btn').onclick = () => { engine.setLayoutMode('filmstrip'); relayout(); };

// --- Example: participant list changes (someone joins/leaves) ---
// function addParticipant(id) { participants = [...participants, { id }]; relayout(); }
// function removeParticipant(id) { participants = participants.filter(p => p.id !== id); relayout(); }

// --- Example: pinning ---
// tileElement.addEventListener('dblclick', () => {
//   engine.setPinnedParticipant(participantId);
//   engine.setLayoutMode('speaker');
//   relayout();
// });
