/**
 * @file LayoutPresets.js
 * @description Hand-tuned, "designed" layouts for small participant counts
 * (1–6), in the style of Google Meet. These exist because pure area-maximizing
 * math (LayoutCalculator's generic grid fit) is mathematically optimal but
 * sometimes visually unsatisfying for a handful of well-known counts — e.g.
 * 3 participants look better as "1 on top, 2 below" (triangle) than as a
 * lopsided 2x2 grid with an empty cell.
 *
 * Every preset here is still computed from real geometry (via
 * LayoutCalculator's fitSingleTile/getOrientation helpers) — nothing is a
 * fixed pixel value. They adapt to container size, aspect ratio, and
 * orientation (landscape vs portrait) just like the generic path.
 *
 * IMPORTANT: This module is intentionally small and named-count-only.
 * Anything not listed in PRESET_COUNTS falls through to the generic
 * LayoutCalculator.fitGridForCount, so there is no hardcoded ceiling —
 * the engine works the same way at 7 participants as at 700.
 */

import { fitSingleTile, getOrientation, DEFAULT_GAP, DEFAULT_ASPECT_RATIO } from './LayoutCalculator.js';

/**
 * Participant counts that have a hand-authored preset. Anything else
 * uses the generic grid-fitting algorithm.
 * @constant {number[]}
 */
const PRESET_COUNTS = [1, 2, 3, 4, 5, 6];

/**
 * @typedef {import('./LayoutCalculator.js').TilePosition} TilePosition
 */

/**
 * 1 participant: a single tile, as large as possible, centered.
 * @param {Object} ctx - shared context, see buildPresetContext()
 * @returns {TilePosition[]}
 */
function layoutOne(ctx) {
  const { containerWidth, containerHeight, aspectRatio, padding } = ctx;
  const tile = fitSingleTile({
    regionWidth: containerWidth,
    regionHeight: containerHeight,
    regionX: 0,
    regionY: 0,
    aspectRatio,
    padding,
  });
  return [{ index: 0, ...tile, row: 0, col: 0 }];
}

/**
 * 2 participants: side-by-side in landscape, stacked in portrait.
 * @param {Object} ctx
 * @returns {TilePosition[]}
 */
function layoutTwo(ctx) {
  const { containerWidth, containerHeight, aspectRatio, gap, padding, orientation } = ctx;
  const positions = [];

  if (orientation === 'portrait') {
    const regionH = (containerHeight - gap) / 2;
    for (let i = 0; i < 2; i++) {
      const tile = fitSingleTile({
        regionWidth: containerWidth,
        regionHeight: regionH,
        regionX: 0,
        regionY: i * (regionH + gap),
        aspectRatio,
        padding,
      });
      positions.push({ index: i, ...tile, row: i, col: 0 });
    }
  } else {
    const regionW = (containerWidth - gap) / 2;
    for (let i = 0; i < 2; i++) {
      const tile = fitSingleTile({
        regionWidth: regionW,
        regionHeight: containerHeight,
        regionX: i * (regionW + gap),
        regionY: 0,
        aspectRatio,
        padding,
      });
      positions.push({ index: i, ...tile, row: 0, col: i });
    }
  }

  return positions;
}

/**
 * 3 participants: "triangle" layout — one tile centered on top, two
 * tiles below it (landscape), or one on top + two stacked on the side
 * for portrait-leaning containers. Mirrors Google Meet's 3-participant view.
 * @param {Object} ctx
 * @returns {TilePosition[]}
 */
function layoutThree(ctx) {
  const { containerWidth, containerHeight, aspectRatio, gap, padding, orientation } = ctx;
  const positions = [];

  if (orientation === 'portrait') {
    // One on top (full width), two below side-by-side.
    const topH = (containerHeight - gap) * 0.5;
    const bottomH = containerHeight - gap - topH;

    const top = fitSingleTile({
      regionWidth: containerWidth,
      regionHeight: topH,
      regionX: 0,
      regionY: 0,
      aspectRatio,
      padding,
    });
    positions.push({ index: 0, ...top, row: 0, col: 0 });

    const bottomRegionW = (containerWidth - gap) / 2;
    for (let i = 0; i < 2; i++) {
      const tile = fitSingleTile({
        regionWidth: bottomRegionW,
        regionHeight: bottomH,
        regionX: i * (bottomRegionW + gap),
        regionY: topH + gap,
        aspectRatio,
        padding,
      });
      positions.push({ index: i + 1, ...tile, row: 1, col: i });
    }
  } else {
    // Landscape: one centered on top (slightly larger region), two below.
    const topH = (containerHeight - gap) * 0.55;
    const bottomH = containerHeight - gap - topH;

    const top = fitSingleTile({
      regionWidth: containerWidth,
      regionHeight: topH,
      regionX: 0,
      regionY: 0,
      aspectRatio,
      padding,
    });
    positions.push({ index: 0, ...top, row: 0, col: 0 });

    const bottomRegionW = (containerWidth - gap) / 2;
    for (let i = 0; i < 2; i++) {
      const tile = fitSingleTile({
        regionWidth: bottomRegionW,
        regionHeight: bottomH,
        regionX: i * (bottomRegionW + gap),
        regionY: topH + gap,
        aspectRatio,
        padding,
      });
      positions.push({ index: i + 1, ...tile, row: 1, col: i });
    }
  }

  return positions;
}

/**
 * 4 participants: clean 2x2 grid.
 * @param {Object} ctx
 * @returns {TilePosition[]}
 */
function layoutFour(ctx) {
  return layoutEvenRegionGrid(ctx, 2, 2, 4);
}

/**
 * 5 participants: "balanced" layout minimizing empty space — 3 tiles on
 * top row, 2 tiles on bottom row (centered), rather than a 2x3 grid with
 * one dangling empty cell.
 * @param {Object} ctx
 * @returns {TilePosition[]}
 */
function layoutFive(ctx) {
  const { containerWidth, containerHeight, aspectRatio, gap, padding, orientation } = ctx;
  const positions = [];

  if (orientation === 'portrait') {
    // Stack: 2 rows of 1, then a row of... portrait with 5 is rare;
    // use 2 columns x 3 rows-ish: top single column pairs.
    const rowsArr = [2, 2, 1]; // 2 top, 2 middle, 1 bottom centered
    const rowH = (containerHeight - gap * (rowsArr.length - 1)) / rowsArr.length;
    let index = 0;
    rowsArr.forEach((colsInRow, row) => {
      const regionW = (containerWidth - gap * (colsInRow - 1)) / colsInRow;
      const rowWidth = colsInRow * regionW + (colsInRow - 1) * gap;
      const offsetX = (containerWidth - rowWidth) / 2;
      for (let c = 0; c < colsInRow; c++) {
        const tile = fitSingleTile({
          regionWidth: regionW,
          regionHeight: rowH,
          regionX: offsetX + c * (regionW + gap),
          regionY: row * (rowH + gap),
          aspectRatio,
          padding,
        });
        positions.push({ index, ...tile, row, col: c });
        index++;
      }
    });
  } else {
    const rowsArr = [3, 2]; // 3 on top, 2 centered below
    const rowH = (containerHeight - gap) / 2;
    let index = 0;
    rowsArr.forEach((colsInRow, row) => {
      const regionW = (containerWidth - gap * (colsInRow - 1)) / colsInRow;
      const rowWidth = colsInRow * regionW + (colsInRow - 1) * gap;
      const offsetX = (containerWidth - rowWidth) / 2;
      for (let c = 0; c < colsInRow; c++) {
        const tile = fitSingleTile({
          regionWidth: regionW,
          regionHeight: rowH,
          regionX: offsetX + c * (regionW + gap),
          regionY: row * (rowH + gap),
          aspectRatio,
          padding,
        });
        positions.push({ index, ...tile, row, col: c });
        index++;
      }
    });
  }

  return positions;
}

/**
 * 6 participants: clean 2x3 grid (2 rows, 3 columns) in landscape,
 * 3x2 (3 rows, 2 columns) in portrait.
 * @param {Object} ctx
 * @returns {TilePosition[]}
 */
function layoutSix(ctx) {
  const { orientation } = ctx;
  return orientation === 'portrait'
    ? layoutEvenRegionGrid(ctx, 3, 2, 6)
    : layoutEvenRegionGrid(ctx, 2, 3, 6);
}

/**
 * Shared helper: lay out `count` tiles in a perfectly even rows x columns
 * grid that fills the container, centered, with gaps. Used by the 4- and
 * 6-participant presets since those are just clean rectangular grids.
 * @param {Object} ctx
 * @param {number} rows
 * @param {number} columns
 * @param {number} count
 * @returns {TilePosition[]}
 */
function layoutEvenRegionGrid(ctx, rows, columns, count) {
  const { containerWidth, containerHeight, aspectRatio, gap, padding } = ctx;
  const positions = [];

  const regionW = (containerWidth - gap * (columns - 1)) / columns;
  const regionH = (containerHeight - gap * (rows - 1)) / rows;

  let index = 0;
  for (let row = 0; row < rows && index < count; row++) {
    for (let col = 0; col < columns && index < count; col++) {
      const tile = fitSingleTile({
        regionWidth: regionW,
        regionHeight: regionH,
        regionX: col * (regionW + gap),
        regionY: row * (regionH + gap),
        aspectRatio,
        padding,
      });
      positions.push({ index, ...tile, row, col });
      index++;
    }
  }

  return positions;
}

/**
 * Dispatch table mapping preset participant counts to their layout function.
 * @type {Object<number, function(Object): TilePosition[]>}
 */
const PRESET_FNS = {
  1: layoutOne,
  2: layoutTwo,
  3: layoutThree,
  4: layoutFour,
  5: layoutFive,
  6: layoutSix,
};

/**
 * Build the shared context object passed to every preset function.
 * @param {Object} options
 * @param {number} options.containerWidth
 * @param {number} options.containerHeight
 * @param {number} [options.aspectRatio]
 * @param {number} [options.gap]
 * @param {number} [options.padding]
 * @returns {Object}
 */
function buildPresetContext({ containerWidth, containerHeight, aspectRatio = DEFAULT_ASPECT_RATIO, gap = DEFAULT_GAP, padding = 0 }) {
  return {
    containerWidth,
    containerHeight,
    aspectRatio,
    gap,
    padding,
    orientation: getOrientation(containerWidth, containerHeight),
  };
}

/**
 * Returns true if `count` has a hand-tuned preset available.
 * @param {number} count
 * @returns {boolean}
 */
function hasPreset(count) {
  return PRESET_COUNTS.includes(count);
}

/**
 * Compute the preset layout for a given participant count. Caller must
 * have already verified hasPreset(count) === true.
 * @param {number} count
 * @param {Object} options - see buildPresetContext
 * @returns {TilePosition[]}
 */
function getPresetLayout(count, options) {
  const fn = PRESET_FNS[count];
  if (!fn) {
    throw new Error(`No preset layout registered for count=${count}. Check hasPreset() first.`);
  }
  const ctx = buildPresetContext(options);
  return fn(ctx);
}

export { PRESET_COUNTS, hasPreset, getPresetLayout, buildPresetContext };
