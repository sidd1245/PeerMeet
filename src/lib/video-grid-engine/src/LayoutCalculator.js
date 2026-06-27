/**
 * @file LayoutCalculator.js
 * @description Pure geometry/math module for the Video Grid Layout Engine.
 *
 * This module has NO knowledge of the DOM, frameworks, or specific apps.
 * It takes numbers in (container size, participant count, aspect ratio)
 * and returns numbers out (rows, columns, tile size, positions).
 *
 * This separation is what makes the engine portable: VideoGridEngine.js
 * orchestrates state/modes, LayoutPresets.js supplies named "shapes" for
 * small counts, and this file does the actual area-maximization math for
 * everything else. None of these files touch `document`.
 */

/**
 * @typedef {Object} TilePosition
 * @property {number} index       - Participant slot index (0-based).
 * @property {number} x           - Left offset in px, relative to container.
 * @property {number} y           - Top offset in px, relative to container.
 * @property {number} width       - Tile width in px.
 * @property {number} height      - Tile height in px.
 * @property {number} row         - Row index (0-based) the tile occupies.
 * @property {number} col         - Column index (0-based) the tile occupies.
 */

/**
 * @typedef {Object} GridLayoutResult
 * @property {number} rows
 * @property {number} columns
 * @property {number} tileWidth
 * @property {number} tileHeight
 * @property {TilePosition[]} positions
 * @property {number} usedArea       - Total px^2 occupied by tiles (for diagnostics).
 * @property {number} containerArea  - px^2 of the container (for diagnostics).
 * @property {number} efficiency     - usedArea / containerArea, 0..1.
 */

/**
 * Default gap (px) inserted between tiles. Callers can override this
 * per-call via the `gap` option on every public function below.
 * @constant {number}
 */
const DEFAULT_GAP = 8;

/**
 * Default tile aspect ratio (width / height) when none is specified.
 * 16:9 is the de-facto standard for webcam/video tiles.
 * @constant {number}
 */
const DEFAULT_ASPECT_RATIO = 16 / 9;

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * For a given number of participants and a fixed (rows x columns) grid,
 * compute the largest tile size (preserving aspectRatio) that fits inside
 * the container, accounting for gaps between tiles.
 *
 * The grid is assumed to be evenly spaced — every cell is the same size —
 * which is the correct model for a "balanced" grid. Uneven last-rows are
 * handled by the caller (LayoutPresets / fitGridForCount), not here.
 *
 * @param {Object} params
 * @param {number} params.rows
 * @param {number} params.columns
 * @param {number} params.containerWidth
 * @param {number} params.containerHeight
 * @param {number} params.aspectRatio - width / height per tile.
 * @param {number} params.gap - px gap between tiles (and from container edge is not added; edge padding is the caller's concern).
 * @returns {{ tileWidth: number, tileHeight: number }}
 */
function computeMaxTileSizeForGrid({ rows, columns, containerWidth, containerHeight, aspectRatio, gap }) {
  // Available space after subtracting inter-tile gaps.
  const totalHGaps = gap * (columns - 1);
  const totalVGaps = gap * (rows - 1);

  const maxCellWidth = (containerWidth - totalHGaps) / columns;
  const maxCellHeight = (containerHeight - totalVGaps) / rows;

  // Constrain by aspect ratio: try width-limited, then height-limited,
  // and pick whichever yields the smaller (i.e. the one that actually fits).
  let tileWidth = maxCellWidth;
  let tileHeight = tileWidth / aspectRatio;

  if (tileHeight > maxCellHeight) {
    tileHeight = maxCellHeight;
    tileWidth = tileHeight * aspectRatio;
  }

  // Guard against negative/zero space (e.g. container smaller than gaps).
  tileWidth = Math.max(0, tileWidth);
  tileHeight = Math.max(0, tileHeight);

  return { tileWidth, tileHeight };
}

/**
 * Generate the list of sensible (rows, columns) candidates to evaluate for
 * a given participant count. We only consider grids where rows*columns >=
 * count and rows*columns - count < columns (i.e. no fully empty trailing
 * row), which keeps the candidate set small (O(sqrt(n))) instead of O(n).
 *
 * @param {number} count
 * @returns {Array<{rows: number, columns: number}>}
 */
function generateGridCandidates(count) {
  if (count <= 0) return [{ rows: 1, columns: 1 }];

  const candidates = [];
  const maxColumns = count; // upper bound; loop is still O(sqrt(n)) effectively pruned below

  for (let columns = 1; columns <= maxColumns; columns++) {
    const rows = Math.ceil(count / columns);

    // Skip candidates that would leave an entirely empty last row,
    // since a smaller row count achieves the same coverage with bigger tiles.
    const emptySlotsInLastRow = rows * columns - count;
    if (emptySlotsInLastRow >= columns) continue;

    candidates.push({ rows, columns });

    // Once columns exceeds rows significantly the tiles only get thinner;
    // bail out early once we've passed the square root region by a margin.
    if (columns > Math.ceil(Math.sqrt(count)) + 3 && candidates.length > 4) {
      break;
    }
  }

  return candidates;
}

/**
 * Evaluate every reasonable (rows, columns) grid for `count` tiles inside
 * the given container, and return the one that maximizes per-tile area
 * (equivalently, maximizes min(tileWidth, tileHeight) scaling under the
 * fixed aspect ratio). This is the core "fit the most pixels" algorithm
 * used for any layout that isn't a hand-tuned preset.
 *
 * Complexity: O(sqrt(count)) grid candidates evaluated, each O(1) — so
 * the whole call is effectively O(sqrt(n)), independent of how the
 * positions array (O(n)) is built afterward.
 *
 * @param {Object} params
 * @param {number} params.count
 * @param {number} params.containerWidth
 * @param {number} params.containerHeight
 * @param {number} [params.aspectRatio=16/9]
 * @param {number} [params.gap=8]
 * @returns {GridLayoutResult}
 */
function fitGridForCount({
  count,
  containerWidth,
  containerHeight,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  gap = DEFAULT_GAP,
}) {
  if (count <= 0) {
    return {
      rows: 0,
      columns: 0,
      tileWidth: 0,
      tileHeight: 0,
      positions: [],
      usedArea: 0,
      containerArea: containerWidth * containerHeight,
      efficiency: 0,
    };
  }

  const candidates = generateGridCandidates(count);

  let best = null;
  let bestTileArea = -1;

  for (const { rows, columns } of candidates) {
    const { tileWidth, tileHeight } = computeMaxTileSizeForGrid({
      rows,
      columns,
      containerWidth,
      containerHeight,
      aspectRatio,
      gap,
    });

    const tileArea = tileWidth * tileHeight;

    if (tileArea > bestTileArea) {
      bestTileArea = tileArea;
      best = { rows, columns, tileWidth, tileHeight };
    }
  }

  const positions = layoutEvenGrid({
    count,
    rows: best.rows,
    columns: best.columns,
    tileWidth: best.tileWidth,
    tileHeight: best.tileHeight,
    containerWidth,
    containerHeight,
    gap,
  });

  const usedArea = best.tileWidth * best.tileHeight * count;
  const containerArea = containerWidth * containerHeight;

  return {
    rows: best.rows,
    columns: best.columns,
    tileWidth: best.tileWidth,
    tileHeight: best.tileHeight,
    positions,
    usedArea,
    containerArea,
    efficiency: containerArea > 0 ? usedArea / containerArea : 0,
  };
}

/**
 * Build concrete x/y positions for an even grid, centering:
 *  - the whole block of rows vertically in the container,
 *  - each row's tiles horizontally in the container,
 *  - and centering a short last row (e.g. 5 tiles in a 2x3 grid → last
 *    row has 2 tiles, centered rather than left-aligned).
 *
 * @param {Object} params
 * @param {number} params.count
 * @param {number} params.rows
 * @param {number} params.columns
 * @param {number} params.tileWidth
 * @param {number} params.tileHeight
 * @param {number} params.containerWidth
 * @param {number} params.containerHeight
 * @param {number} params.gap
 * @returns {TilePosition[]}
 */
function layoutEvenGrid({ count, rows, columns, tileWidth, tileHeight, containerWidth, containerHeight, gap }) {
  const positions = [];

  const gridWidth = columns * tileWidth + (columns - 1) * gap;
  const gridHeight = rows * tileHeight + (rows - 1) * gap;

  const offsetY = (containerHeight - gridHeight) / 2;
  const baseOffsetX = (containerWidth - gridWidth) / 2;

  let index = 0;
  for (let row = 0; row < rows; row++) {
    const remaining = count - index;
    const colsInThisRow = Math.min(columns, remaining);

    // Center short rows (e.g. the final, partially-filled row).
    const rowWidth = colsInThisRow * tileWidth + (colsInThisRow - 1) * gap;
    const rowOffsetX = (containerWidth - rowWidth) / 2;
    const offsetX = colsInThisRow === columns ? baseOffsetX : rowOffsetX;

    for (let col = 0; col < colsInThisRow; col++) {
      positions.push({
        index,
        x: offsetX + col * (tileWidth + gap),
        y: offsetY + row * (tileHeight + gap),
        width: tileWidth,
        height: tileHeight,
        row,
        col,
      });
      index++;
    }
  }

  return positions;
}

/**
 * Compute a single tile's max size to fill a given rectangular region
 * while preserving aspect ratio, then center it in that region. Used by
 * preset layouts (speaker view, screen-share main area, single
 * full-screen tile, etc.) where "the grid" is really just one cell.
 *
 * @param {Object} params
 * @param {number} params.regionWidth
 * @param {number} params.regionHeight
 * @param {number} params.regionX
 * @param {number} params.regionY
 * @param {number} [params.aspectRatio=16/9]
 * @param {number} [params.padding=0] - px padding subtracted from region on all sides.
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
function fitSingleTile({ regionWidth, regionHeight, regionX, regionY, aspectRatio = DEFAULT_ASPECT_RATIO, padding = 0 }) {
  const availW = Math.max(0, regionWidth - padding * 2);
  const availH = Math.max(0, regionHeight - padding * 2);

  let width = availW;
  let height = width / aspectRatio;

  if (height > availH) {
    height = availH;
    width = height * aspectRatio;
  }

  const x = regionX + padding + (availW - width) / 2;
  const y = regionY + padding + (availH - height) / 2;

  return { x, y, width: Math.max(0, width), height: Math.max(0, height) };
}

/**
 * Determine container orientation, used by presets to mirror layouts
 * (e.g. a "row of two" becomes a "column of two" in portrait mode).
 * @param {number} containerWidth
 * @param {number} containerHeight
 * @returns {'landscape'|'portrait'|'square'}
 */
function getOrientation(containerWidth, containerHeight) {
  const ratio = containerWidth / containerHeight;
  if (Math.abs(ratio - 1) < 0.05) return 'square';
  return ratio > 1 ? 'landscape' : 'portrait';
}

export {
  DEFAULT_GAP,
  DEFAULT_ASPECT_RATIO,
  clamp,
  computeMaxTileSizeForGrid,
  generateGridCandidates,
  fitGridForCount,
  layoutEvenGrid,
  fitSingleTile,
  getOrientation,
};
