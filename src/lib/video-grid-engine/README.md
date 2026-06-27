# video-grid-engine

A framework-agnostic layout engine for video conferencing grids. It computes
**exact tile geometry** — rows, columns, tile size, and per-participant
x/y/width/height — from real area-maximization math, not CSS Grid
guesswork. Bring your own renderer (DOM, React, Vue, Canvas, whatever);
this engine only does the math.

```
calculateLayout({ participantCount: 7, containerWidth: 1280, containerHeight: 720 })
→ { rows: 3, columns: 3, tileWidth: 417, tileHeight: 235, positions: [...] }
```

## Why not just use CSS Grid?

CSS Grid (or flexbox-wrap) can place N boxes in a grid, but it can't:

- Maximize tile *area* under a fixed aspect ratio across arbitrary N
  (CSS doesn't do "try every reasonable row/column split and pick the
  best one").
- Produce non-uniform "designed" shapes like Meet's 3-participant
  triangle or 5-participant balanced layout (3-on-top/2-below).
- Tell you the active speaker's tile should be 5x larger while everyone
  else becomes a thumbnail strip.
- Report when a layout has overflowed and needs to scroll instead of
  squeezing tiles into illegibility.

This engine solves all of that as pure geometry, decoupled from rendering.

## File structure

```
video-grid-engine/
├── src/
│   ├── LayoutCalculator.js   # Pure math: grid search, area maximization, single-tile fitting
│   ├── LayoutPresets.js      # Hand-tuned shapes for 1-6 participants (Meet-style)
│   ├── VideoGridEngine.js    # Public API: modes, pinning, caching, resize coalescing
│   ├── index.js              # Barrel export
│   └── index.d.ts            # TypeScript definitions
├── css/
│   └── video-grid-engine.css # Positioning + transition styles for rendering output
├── examples/
│   ├── vanilla-dom.js        # Reference DOM renderer (read this first)
│   ├── livekit-integration.js
│   ├── webrtc-integration.js
│   ├── React.jsx
│   └── Vue.js
└── README.md
```

**Why three core files instead of one?**
- `LayoutCalculator.js` has zero knowledge of "participants," "modes," or
  presets — it's just geometry (rows/cols/tile-size given a box and a
  count). You could lift this file into a completely unrelated project
  (a photo grid, a dashboard tile layout) and it would still work.
- `LayoutPresets.js` depends only on `LayoutCalculator.js`'s primitives.
  It's where the *design opinions* live (triangle for 3, etc.) — isolated
  so you can swap in your own presets without touching the math.
- `VideoGridEngine.js` is the only stateful piece: it owns the current
  mode, pin state, result cache, and resize coalescing. It calls into the
  other two but contains no DOM code itself.

## Installation

Copy the `src/` (and optionally `css/`) directory into your project. No
build step or dependencies required — it's plain ES modules.

```js
import VideoGridEngine from './video-grid-engine/src/index.js';
```

## Quick start

```js
import VideoGridEngine from 'video-grid-engine';

const engine = new VideoGridEngine({ aspectRatio: 16 / 9, gap: 8 });

const layout = engine.calculateLayout({
  participantCount: 5,
  containerWidth: 1280,
  containerHeight: 720,
});

console.log(layout);
// {
//   mode: 'grid',
//   rows: 2,
//   columns: 3,
//   tileWidth: 408,
//   tileHeight: 229.5,
//   positions: [
//     { index: 0, participantId: '0', x: 16, y: 0, width: 408, height: 229.5, row: 0, col: 0 },
//     ...
//   ],
//   mainParticipantId: null,
//   efficiency: 0.81,
//   isOverflowing: false,
//   scrollExtent: null
// }
```

For real apps, pass full `participants` objects instead of a bare count,
so the engine can resolve speaker/screen-share/pin state:

```js
const layout = engine.calculateLayout({
  participants: [
    { id: 'alice', isActiveSpeaker: true },
    { id: 'bob' },
    { id: 'carol', isScreenSharing: true },
  ],
  containerWidth: 1280,
  containerHeight: 720,
});
```

## API reference

### `new VideoGridEngine(config?)`

| Option | Default | Description |
|---|---|---|
| `aspectRatio` | `16/9` | Default per-tile aspect ratio (width/height) |
| `gap` | `8` | Px gap between tiles |
| `padding` | `0` | Px padding from container edges |
| `mode` | `'grid'` | Initial layout mode |
| `filmstripFraction` | `0.18` | Fraction of container the filmstrip strip occupies |
| `mainStageFraction` | `0.78` | Reserved for future main-stage sizing tuning |

### `engine.calculateLayout(params) → LayoutResult`

| Param | Required | Description |
|---|---|---|
| `participantCount` | one of these two | Anonymous participant count (ids become `"0"`, `"1"`, ...) |
| `participants` | one of these two | Full `{ id, isActiveSpeaker?, isScreenSharing?, isPinned?, aspectRatio? }[]` |
| `containerWidth` | yes | Px |
| `containerHeight` | yes | Px |
| `aspectRatio` | no | Overrides engine default for this call |
| `gap` | no | Overrides engine default for this call |
| `padding` | no | Overrides engine default for this call |

Returns a `LayoutResult`:

```ts
{
  mode: 'grid' | 'speaker' | 'presentation' | 'filmstrip',
  rows: number,
  columns: number,
  tileWidth: number,
  tileHeight: number,
  positions: Array<{
    index: number,
    participantId: string | null,
    x: number, y: number, width: number, height: number,
    row: number, col: number,
  }>,
  mainParticipantId: string | null,
  efficiency: number,        // 0..1, container area used — diagnostic only
  isOverflowing: boolean,    // true if content exceeds container (filmstrip/speaker strip)
  scrollExtent: number|null, // total strip length in px, when isOverflowing
}
```

Calls are **cached**: calling `calculateLayout` twice with equivalent
inputs (same count, size, mode, aspect ratio, main participant) returns
the exact same object reference without recomputing — this is the
primary anti-thrashing mechanism.

### `engine.resize(params) → Promise<LayoutResult>`

Same params as `calculateLayout`. Coalesces rapid-fire calls (e.g. from a
`ResizeObserver` firing many times during a drag-resize) into a single
`requestAnimationFrame`, so you never do more than one layout pass per
frame. Use this instead of calling `calculateLayout` directly inside
resize handlers.

### `engine.setLayoutMode(mode)`

`mode` is one of `'grid' | 'speaker' | 'presentation' | 'filmstrip'`.
Throws on invalid input. Invalidates the cache so the next
`calculateLayout` call recomputes.

### `engine.setPinnedParticipant(id | null)`

Forces that participant into the "main" slot in `speaker`/`presentation`
modes, overriding active-speaker detection. Pass `null` to unpin.

### `engine.onLayoutChange(listener) → unsubscribe`

Fires `listener(layoutResult)` every time a *new* (non-cached) layout is
computed. Useful for side effects (analytics, telemetry) decoupled from
your render call site.

## Layout modes

### `grid` (default)
Every participant gets an equal-sized tile. Counts 1–6 use hand-tuned
presets (see below); 7+ uses the generic area-maximizing search across
every reasonable row×column split — `O(√n)` candidates evaluated, so it's
just as fast at 100 participants as at 10.

### `speaker`
The active speaker (or pinned participant) fills a large main region;
everyone else becomes a thumbnail strip beneath it. If there are too many
"others" to keep thumbnails legible, the strip is flagged
`isOverflowing: true` with a `scrollExtent` instead of shrinking
thumbnails into illegibility — render that case as a horizontally
scrollable strip.

### `presentation`
Structurally identical to `speaker` mode (one big region + thumbnail
strip), but semantically distinct so your UI can show "X is presenting"
chrome. The engine auto-selects the active screen-sharer as the main
participant if one exists.

### `filmstrip`
Every participant rendered as a uniform-size thumbnail in a single row
(landscape containers) or column (portrait containers). Thumbnails keep
a consistent size — they don't grow to fill the container — so the UI
doesn't jitter as people join/leave. When the strip's natural length
exceeds the container, the engine shrinks tiles down to a floor (40% of
natural size) before giving up and reporting overflow for the caller to
make scrollable.

## Small-count presets (1–6 participants)

| Count | Layout |
|---|---|
| 1 | Single full-screen tile |
| 2 | Side-by-side (landscape) / stacked (portrait) |
| 3 | Triangle — one on top, two below |
| 4 | Clean 2×2 grid |
| 5 | Balanced 3-top / 2-bottom-centered (minimizes empty space vs. a lopsided 2×3) |
| 6 | Clean 2×3 (landscape) / 3×2 (portrait) |

These are **not hardcoded pixel layouts** — every preset computes real
geometry from `containerWidth`/`containerHeight`/`aspectRatio` via the
same `fitSingleTile` primitive the generic path uses; they just encode a
different *shape* (which regions exist) than a uniform grid would.

Counts above 6 always use the generic algorithm — there's no hidden
ceiling or hardcoded table to maintain as your product grows.

## Performance characteristics

- Grid-mode layout search: `O(√n)` row/column candidates evaluated, each
  `O(1)` — not `O(n)` and definitely not `O(n²)`.
- Position generation (turning the winning grid into concrete x/y per
  tile): `O(n)`, which is the theoretical minimum since you have to emit
  *n* positions.
- Benchmark (this repo, Node 22, M-series-class CPU):

  | Participants | Time |
  |---|---|
  | 10 | <1ms |
  | 100 | <1ms |
  | 1,000 | ~3ms |
  | 5,000 | ~46ms |

- Repeated calls with unchanged inputs hit an internal cache (same object
  reference returned, zero recomputation).
- `resize()` coalesces to one calculation per animation frame regardless
  of how many resize events fire.

## CSS

See `css/video-grid-engine.css`. The contract: the engine gives you
numbers; you set them as CSS custom properties (`--vge-x`, `--vge-y`,
`--vge-w`, `--vge-h`) on each tile, and the stylesheet's `transition`
rules handle animating between layouts smoothly. No CSS Grid/Flexbox
layout rules are involved — every tile is `position: absolute` and
explicitly placed.

```js
tile.style.setProperty('--vge-x', `${pos.x}px`);
tile.style.setProperty('--vge-y', `${pos.y}px`);
tile.style.setProperty('--vge-w', `${pos.width}px`);
tile.style.setProperty('--vge-h', `${pos.height}px`);
```

## Integration examples

- [`examples/vanilla-dom.js`](examples/vanilla-dom.js) — read this first;
  every other integration follows the same create/update/remove tile
  pattern.
- [`examples/livekit-integration.js`](examples/livekit-integration.js)
- [`examples/webrtc-integration.js`](examples/webrtc-integration.js) — plain `RTCPeerConnection`, no SFU
- [`examples/React.jsx`](examples/React.jsx) — hook + component
- [`examples/Vue.js`](examples/Vue.js) — Vue 3 composable + SFC

## Design notes / non-goals

- The engine doesn't touch the DOM, doesn't import React/Vue/any SDK, and
  has no build step. Pure ES modules, pure functions where possible.
- "Maximize tile size" is implemented as: enumerate plausible (rows,
  columns) pairs for *n* tiles, compute the largest aspect-ratio-correct
  tile that fits each grid, and keep the grid with the largest resulting
  tile area. This is the same family of approach used by Meet/Zoom/Teams,
  not a fixed lookup table.
- Where a layout could overflow (filmstrip, speaker-mode thumbnail
  strip), the engine never silently violates the container bounds — it
  either shrinks down to a legibility floor or reports `isOverflowing` +
  `scrollExtent` so your renderer can make an informed choice (usually:
  add `overflow-x: auto`).
