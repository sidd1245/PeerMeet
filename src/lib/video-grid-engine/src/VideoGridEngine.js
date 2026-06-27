/**
 * @file VideoGridEngine.js
 * @description Public entry point for the Video Grid Layout Engine.
 *
 * This is the ONLY file most consumers need to import. It is a thin,
 * stateful orchestrator on top of two pure modules:
 *   - LayoutCalculator.js  → generic area-maximizing grid math
 *   - LayoutPresets.js     → hand-tuned shapes for 1-6 participants
 *
 * VideoGridEngine itself never touches the DOM. It is given numbers
 * (container size) and participant data (just an id, plus optional
 * flags like isScreenSharing), and it returns numbers (a layout
 * descriptor). Rendering that descriptor into actual DOM nodes is the
 * caller's job — see examples/ for React, Vue, plain DOM, LiveKit and
 * WebRTC adapters that all consume the same engine.
 *
 * Design goals:
 *  - Framework-agnostic: zero DOM/browser API dependency in the core path.
 *  - O(sqrt(n)) layout search + O(n) position generation; no O(n^2) anywhere.
 *  - No layout thrashing: resize() is rAF-coalesced, and recalculation is
 *    skipped entirely if nothing relevant has changed since the last call.
 *  - Mode-driven: grid / speaker / presentation(screen-share) / filmstrip,
 *    switchable at runtime via setLayoutMode().
 */

import { fitGridForCount, fitSingleTile, DEFAULT_GAP, DEFAULT_ASPECT_RATIO } from './LayoutCalculator.js';
import { hasPreset, getPresetLayout } from './LayoutPresets.js';

/**
 * @typedef {'grid'|'speaker'|'presentation'|'filmstrip'} LayoutMode
 */

/**
 * @typedef {Object} Participant
 * @property {string} id - Unique participant/track identifier.
 * @property {boolean} [isScreenSharing] - True if this participant is the active screen-share source.
 * @property {boolean} [isActiveSpeaker] - True if this participant is the current active/dominant speaker.
 * @property {boolean} [isPinned] - True if the local user has pinned this participant.
 * @property {number} [aspectRatio] - Per-tile override aspect ratio (e.g. a screen-share tile is often not 16:9).
 */

/**
 * @typedef {import('./LayoutCalculator.js').TilePosition} TilePosition
 */

/**
 * @typedef {Object} LayoutResult
 * @property {LayoutMode} mode               - The mode that produced this layout.
 * @property {number} rows                   - Rows in the main grid region (0 for non-grid regions like a single speaker tile).
 * @property {number} columns                - Columns in the main grid region.
 * @property {number} tileWidth              - Width of a standard grid tile, in px.
 * @property {number} tileHeight             - Height of a standard grid tile, in px.
 * @property {TilePosition[]} positions      - Flat list of every visible tile's position/size, indexed to match the participants array order.
 * @property {string|null} mainParticipantId - In speaker/presentation mode, the id of the large/main tile. Null in grid/filmstrip.
 * @property {number} efficiency             - Fraction (0..1) of container area covered by tiles. Diagnostic only.
 * @property {boolean} [isOverflowing]        - Filmstrip mode only: true if tiles exceed the container's available length and the caller should render a scrollable strip rather than expect everything to fit.
 * @property {number|null} [scrollExtent]     - Filmstrip mode only: total strip length in px when isOverflowing is true (for setting scroll container content size); null otherwise.
 */

const VALID_MODES = ['grid', 'speaker', 'presentation', 'filmstrip'];

/**
 * Default configuration applied when not overridden per-call or at construction.
 * @constant
 */
const DEFAULTS = {
  aspectRatio: DEFAULT_ASPECT_RATIO,
  gap: DEFAULT_GAP,
  padding: 0,
  mode: 'grid',
  /** Max tiles shown in the filmstrip strip before others are considered "overflow" (engine still returns all; UI decides what to do with overflow). */
  filmstripVisibleCount: 8,
  /** Fraction of the container the filmstrip strip occupies (along its short axis). */
  filmstripFraction: 0.18,
  /** Fraction of the container width given to the main stage in speaker/presentation mode. */
  mainStageFraction: 0.78,
};

/**
 * Shallow-compares the fields of a layout request that matter for
 * deciding whether a recalculation is necessary. Used to skip redundant
 * work (anti-thrashing) when resize() or calculateLayout() is called
 * repeatedly with effectively the same inputs (e.g. multiple rAF ticks
 * during a drag-resize where size didn't actually change).
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
function isEquivalentRequest(a, b) {
  if (!a || !b) return false;
  return (
    a.participantCount === b.participantCount &&
    Math.round(a.containerWidth) === Math.round(b.containerWidth) &&
    Math.round(a.containerHeight) === Math.round(b.containerHeight) &&
    a.aspectRatio === b.aspectRatio &&
    a.mode === b.mode &&
    a.mainParticipantId === b.mainParticipantId
  );
}

/**
 * VideoGridEngine — stateful layout orchestrator.
 *
 * @example
 * const engine = new VideoGridEngine({ aspectRatio: 16 / 9, gap: 8 });
 * const layout = engine.calculateLayout({
 *   participantCount: 5,
 *   containerWidth: 1280,
 *   containerHeight: 720,
 * });
 * // layout.positions[i] -> { x, y, width, height, ... } for participant i
 */
class VideoGridEngine {
  /**
   * @param {Object} [config]
   * @param {number} [config.aspectRatio=16/9] - Default per-tile aspect ratio.
   * @param {number} [config.gap=8] - Default px gap between tiles.
   * @param {number} [config.padding=0] - Default px padding from container edges.
   * @param {LayoutMode} [config.mode='grid'] - Initial layout mode.
   * @param {number} [config.filmstripVisibleCount=8]
   * @param {number} [config.filmstripFraction=0.18]
   * @param {number} [config.mainStageFraction=0.78]
   */
  constructor(config = {}) {
    /** @private */
    this._config = { ...DEFAULTS, ...config };

    /** @private @type {LayoutMode} */
    this._mode = this._config.mode;

    /** @private @type {string|null} pinned participant id, takes precedence over active speaker */
    this._pinnedId = null;

    /** @private @type {string|null} cache key inputs from the last calculation, for thrash-avoidance */
    this._lastRequest = null;

    /** @private @type {LayoutResult|null} */
    this._lastResult = null;

    /** @private resize coalescing handle */
    this._pendingResize = null;

    /** @private @type {Function[]} */
    this._listeners = [];
  }

  /**
   * Switch the active layout mode at runtime.
   * @param {LayoutMode} mode
   * @throws {Error} if mode is not one of 'grid' | 'speaker' | 'presentation' | 'filmstrip'
   */
  setLayoutMode(mode) {
    if (!VALID_MODES.includes(mode)) {
      throw new Error(`Invalid layout mode "${mode}". Expected one of: ${VALID_MODES.join(', ')}`);
    }
    if (mode !== this._mode) {
      this._mode = mode;
      this._invalidate();
    }
  }

  /**
   * @returns {LayoutMode} the current layout mode
   */
  getLayoutMode() {
    return this._mode;
  }

  /**
   * Pin a participant, forcing them into the "main" position in
   * speaker/presentation mode regardless of who is actively speaking.
   * Pass null to unpin.
   * @param {string|null} participantId
   */
  setPinnedParticipant(participantId) {
    if (this._pinnedId !== participantId) {
      this._pinnedId = participantId;
      this._invalidate();
    }
  }

  /**
   * @returns {string|null} currently pinned participant id, if any
   */
  getPinnedParticipant() {
    return this._pinnedId;
  }

  /**
   * Force the next calculateLayout() call to recompute even if inputs
   * look identical to the last call. Rarely needed externally — exists
   * mainly for completeness/testing.
   */
  invalidate() {
    this._invalidate();
  }

  /** @private */
  _invalidate() {
    this._lastRequest = null;
    this._lastResult = null;
  }

  /**
   * Core API. Computes a full layout descriptor for the given
   * participants and container geometry. Pure function of its inputs
   * plus the engine's current mode/pin state — calling it twice with
   * the same arguments and the same mode/pin state returns an
   * equivalent result (and the second call is served from cache).
   *
   * @param {Object} params
   * @param {number} [params.participantCount] - Convenience form: number of anonymous participants (ids will be "0".."n-1"). Ignored if `participants` is provided.
   * @param {Participant[]} [params.participants] - Full participant list. Preferred when you need screen-share/speaker/pin metadata.
   * @param {number} params.containerWidth - Available width in px.
   * @param {number} params.containerHeight - Available height in px.
   * @param {number} [params.aspectRatio] - Overrides the engine-level default for this call.
   * @param {number} [params.gap] - Overrides the engine-level default for this call.
   * @param {number} [params.padding] - Overrides the engine-level default for this call.
   * @returns {LayoutResult}
   */
  calculateLayout(params) {
    const {
      participantCount,
      participants: rawParticipants,
      containerWidth,
      containerHeight,
      aspectRatio = this._config.aspectRatio,
      gap = this._config.gap,
      padding = this._config.padding,
    } = params;

    if (containerWidth <= 0 || containerHeight <= 0) {
      return this._emptyResult();
    }

    const participants = this._normalizeParticipants(rawParticipants, participantCount);
    if (participants.length === 0) {
      return this._emptyResult();
    }

    const mainParticipantId = this._resolveMainParticipant(participants);

    const cacheKey = {
      participantCount: participants.length,
      containerWidth,
      containerHeight,
      aspectRatio,
      mode: this._mode,
      mainParticipantId,
    };

    if (isEquivalentRequest(cacheKey, this._lastRequest)) {
      return this._lastResult;
    }

    let result;
    switch (this._mode) {
      case 'speaker':
        result = this._calculateSpeakerLayout(participants, mainParticipantId, { containerWidth, containerHeight, aspectRatio, gap, padding });
        break;
      case 'presentation':
        result = this._calculatePresentationLayout(participants, mainParticipantId, { containerWidth, containerHeight, aspectRatio, gap, padding });
        break;
      case 'filmstrip':
        result = this._calculateFilmstripLayout(participants, mainParticipantId, { containerWidth, containerHeight, aspectRatio, gap, padding });
        break;
      case 'grid':
      default:
        result = this._calculateGridLayout(participants, { containerWidth, containerHeight, aspectRatio, gap, padding });
        break;
    }

    this._lastRequest = cacheKey;
    this._lastResult = result;
    this._notifyListeners(result);

    return result;
  }

  /**
   * Convenience wrapper around calculateLayout() intended for window
   * resize handlers. Internally coalesces rapid-fire calls into a single
   * requestAnimationFrame so resize storms don't cause layout thrashing
   * or redundant DOM writes. Returns a Promise resolving with the layout
   * once it has actually been (re)computed.
   *
   * If `requestAnimationFrame` isn't available (e.g. a non-browser/SSR
   * environment), falls back to synchronous calculation.
   *
   * @param {Object} params - same shape as calculateLayout()
   * @returns {Promise<LayoutResult>}
   */
  resize(params) {
    if (typeof requestAnimationFrame !== 'function') {
      return Promise.resolve(this.calculateLayout(params));
    }

    if (this._pendingResize) {
      // A resize is already queued; just update the params it will use.
      this._pendingResize.params = params;
      return this._pendingResize.promise;
    }

    const pending = {};
    pending.params = params;
    pending.promise = new Promise((resolve) => {
      requestAnimationFrame(() => {
        const result = this.calculateLayout(pending.params);
        this._pendingResize = null;
        resolve(result);
      });
    });

    this._pendingResize = pending;
    return pending.promise;
  }

  /**
   * Subscribe to layout changes. Called every time calculateLayout()
   * produces a *new* (non-cached) result. Returns an unsubscribe function.
   * @param {function(LayoutResult): void} listener
   * @returns {function(): void} unsubscribe
   */
  onLayoutChange(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  /** @private */
  _notifyListeners(result) {
    for (const listener of this._listeners) {
      listener(result);
    }
  }

  /** @private */
  _emptyResult() {
    return {
      mode: this._mode,
      rows: 0,
      columns: 0,
      tileWidth: 0,
      tileHeight: 0,
      positions: [],
      mainParticipantId: null,
      efficiency: 0,
      isOverflowing: false,
      scrollExtent: null,
    };
  }

  /**
   * Accepts either a plain `participantCount` (anonymous participants)
   * or a full `participants` array, and always returns a normalized
   * Participant[] internally.
   * @private
   * @param {Participant[]|undefined} participants
   * @param {number|undefined} participantCount
   * @returns {Participant[]}
   */
  _normalizeParticipants(participants, participantCount) {
    if (Array.isArray(participants)) {
      return participants;
    }
    const count = Math.max(0, Math.floor(participantCount || 0));
    const result = new Array(count);
    for (let i = 0; i < count; i++) {
      result[i] = { id: String(i) };
    }
    return result;
  }

  /**
   * Decide who occupies the "main" slot in speaker/presentation mode.
   * Priority: explicit pin > active screen-share > active speaker > first participant.
   * @private
   * @param {Participant[]} participants
   * @returns {string|null}
   */
  _resolveMainParticipant(participants) {
    if (this._pinnedId && participants.some((p) => p.id === this._pinnedId)) {
      return this._pinnedId;
    }
    const screenShare = participants.find((p) => p.isScreenSharing);
    if (screenShare) return screenShare.id;

    const activeSpeaker = participants.find((p) => p.isActiveSpeaker);
    if (activeSpeaker) return activeSpeaker.id;

    return participants[0] ? participants[0].id : null;
  }

  /**
   * GRID MODE: every participant gets an equally-sized tile, laid out
   * using the preset shapes for 1-6 participants or the generic
   * area-maximizing algorithm for everything else.
   * @private
   */
  _calculateGridLayout(participants, geo) {
    const { containerWidth, containerHeight, aspectRatio, gap, padding } = geo;
    const count = participants.length;

    const innerWidth = containerWidth - padding * 2;
    const innerHeight = containerHeight - padding * 2;

    let positions, rows, columns, tileWidth, tileHeight, efficiency;

    if (hasPreset(count)) {
      positions = getPresetLayout(count, { containerWidth: innerWidth, containerHeight: innerHeight, aspectRatio, gap, padding: 0 });
      // Derive an approximate rows/columns/tile size summary for the preset
      // (useful metadata for consumers, even though tiles may vary slightly in size).
      rows = Math.max(...positions.map((p) => p.row)) + 1;
      columns = Math.max(...positions.map((p) => p.col)) + 1;
      tileWidth = positions[0].width;
      tileHeight = positions[0].height;
      const usedArea = positions.reduce((sum, p) => sum + p.width * p.height, 0);
      efficiency = (innerWidth * innerHeight) > 0 ? usedArea / (innerWidth * innerHeight) : 0;
    } else {
      const fit = fitGridForCount({ count, containerWidth: innerWidth, containerHeight: innerHeight, aspectRatio, gap });
      positions = fit.positions;
      rows = fit.rows;
      columns = fit.columns;
      tileWidth = fit.tileWidth;
      tileHeight = fit.tileHeight;
      efficiency = fit.efficiency;
    }

    // Offset every tile by `padding` (presets/fitGrid compute in the inner box).
    positions = positions.map((p) => ({ ...p, x: p.x + padding, y: p.y + padding }));

    return {
      mode: 'grid',
      rows,
      columns,
      tileWidth,
      tileHeight,
      positions: this._attachParticipantIds(positions, participants),
      mainParticipantId: null,
      efficiency,
      isOverflowing: false,
      scrollExtent: null,
    };
  }

  /**
   * SPEAKER MODE: the main/active participant fills a large region; all
   * remaining participants are arranged in a smaller grid alongside it
   * (below, if the container is landscape; to the side is also
   * supported by swapping mainStageFraction axis — kept simple here as
   * "main on top, thumbnails below" which matches most production apps).
   * @private
   */
  _calculateSpeakerLayout(participants, mainId, geo) {
    const { containerWidth, containerHeight, aspectRatio, gap, padding } = geo;
    const others = participants.filter((p) => p.id !== mainId);
    const main = participants.find((p) => p.id === mainId);

    const innerWidth = containerWidth - padding * 2;
    const innerHeight = containerHeight - padding * 2;

    if (others.length === 0) {
      // Only one participant total — identical to grid-of-1.
      const tile = fitSingleTile({ regionWidth: innerWidth, regionHeight: innerHeight, regionX: padding, regionY: padding, aspectRatio });
      return {
        mode: 'speaker',
        rows: 1,
        columns: 1,
        tileWidth: tile.width,
        tileHeight: tile.height,
        positions: [{ index: 0, participantId: mainId, ...tile, row: 0, col: 0 }],
        mainParticipantId: mainId,
        efficiency: (tile.width * tile.height) / (innerWidth * innerHeight || 1),
        isOverflowing: false,
        scrollExtent: null,
      };
    }

    // Reserve a thumbnail strip for "others" beneath the main stage.
    // The strip's height is capped (never more than 22% of available
    // height, or 180px, whichever is smaller) so the main stage always
    // dominates, matching how Meet/Zoom/Teams speaker view looks.
    const stripHeight = Math.min(innerHeight * 0.22, 180);
    const mainHeight = innerHeight - stripHeight - gap;

    const mainTile = fitSingleTile({
      regionWidth: innerWidth,
      regionHeight: mainHeight,
      regionX: padding,
      regionY: padding,
      aspectRatio: main && main.aspectRatio ? main.aspectRatio : aspectRatio,
    });

    // Lay the remaining participants out as a single horizontal row of
    // thumbnails. If there are too many to keep thumbnails legibly sized,
    // _layoutSingleRow enforces a minimum width and the strip is flagged
    // as overflowing so the caller can make it horizontally scrollable —
    // same anti-illegibility contract as filmstrip mode.
    const { positions: stripPositions, isOverflowing: stripOverflowing, rowLength } = this._layoutSingleRow(
      others.length,
      innerWidth,
      stripHeight,
      aspectRatio,
      gap,
      padding,
      padding + mainHeight + gap
    );

    const positions = [
      { index: 0, participantId: mainId, ...mainTile, row: 0, col: 0 },
      ...stripPositions,
    ];

    const usedArea = mainTile.width * mainTile.height + stripPositions.reduce((s, p) => s + p.width * p.height, 0);

    return {
      mode: 'speaker',
      rows: 2,
      columns: Math.max(1, others.length),
      tileWidth: mainTile.width,
      tileHeight: mainTile.height,
      positions: this._attachParticipantIds(positions, [main, ...others], true),
      mainParticipantId: mainId,
      efficiency: usedArea / (innerWidth * innerHeight || 1),
      isOverflowing: stripOverflowing,
      scrollExtent: stripOverflowing ? rowLength : null,
    };
  }

  /**
   * PRESENTATION MODE: like speaker mode, but the "main" region is
   * meant for screen-share content, which is typically NOT 16:9 webcam
   * footage — it commonly matches the shared screen's own ratio. We
   * default to a wider aspect ratio (16:9 still works fine for most
   * screens) but honor `participant.aspectRatio` on the sharer if given.
   * Structurally this is the same algorithm as speaker mode; the
   * distinction is kept as a separate mode so callers can apply
   * different CSS/UX treatment (e.g. "X is presenting" banner) and so
   * the engine signals intent clearly via `result.mode`.
   * @private
   */
  _calculatePresentationLayout(participants, mainId, geo) {
    const result = this._calculateSpeakerLayout(participants, mainId, geo);
    return { ...result, mode: 'presentation' };
  }

  /**
   * FILMSTRIP MODE: all participants in a single row (or column, in
   * portrait containers), uniformly sized as fixed-aspect thumbnails.
   *
   * Unlike grid mode, tiles do NOT grow/shrink to guarantee everything
   * fits — they keep a consistent thumbnail size (computed from the
   * container's short axis, never hardcoded in px) so tiles don't
   * jitter in size as participants join or leave. When the strip's
   * natural length exceeds the container, the *engine* shrinks tiles
   * just enough to keep every tile within bounds UNLESS that would
   * make tiles smaller than `minThumbnailFraction` of the container's
   * short axis — past that point, it stops shrinking and instead
   * reports `isOverflowing: true` plus a `scrollExtent` (the total
   * strip length in px) so the caller can render a scrollable strip
   * (overflow-x/y: auto) instead of cramming everything in. This
   * mirrors how Meet/Zoom/Teams filmstrips behave at high participant
   * counts: scroll, don't shrink to illegibility.
   * @private
   */
  _calculateFilmstripLayout(participants, mainId, geo) {
    const { containerWidth, containerHeight, aspectRatio, gap, padding } = geo;
    const innerWidth = containerWidth - padding * 2;
    const innerHeight = containerHeight - padding * 2;
    const count = participants.length;

    const isPortraitContainer = innerHeight > innerWidth;
    const fraction = this._config.filmstripFraction;
    const minThumbnailFraction = 0.45; // never shrink below 45% of the "natural" thumbnail size

    let tileWidth, tileHeight, naturalStripLength, availableLength, shortAxis;

    if (isPortraitContainer) {
      shortAxis = innerWidth;
      tileWidth = innerWidth * fraction;
      tileHeight = tileWidth / aspectRatio;
      naturalStripLength = count * tileHeight + Math.max(0, count - 1) * gap;
      availableLength = innerHeight;
    } else {
      shortAxis = innerHeight;
      tileHeight = innerHeight * fraction;
      tileWidth = tileHeight * aspectRatio;
      naturalStripLength = count * tileWidth + Math.max(0, count - 1) * gap;
      availableLength = innerWidth;
    }

    let isOverflowing = false;
    if (naturalStripLength > availableLength && count > 0) {
      // Try shrinking tiles uniformly to fit exactly.
      const shrinkFactor = (availableLength - gap * Math.max(0, count - 1)) / (naturalStripLength - gap * Math.max(0, count - 1));
      if (shrinkFactor >= minThumbnailFraction) {
        tileWidth *= shrinkFactor;
        tileHeight *= shrinkFactor;
      } else {
        // Shrinking that much would make thumbnails too small to be useful;
        // keep natural size and let the strip overflow (caller scrolls).
        isOverflowing = true;
      }
    }

    const finalStripLength = count * (isPortraitContainer ? tileHeight : tileWidth) + Math.max(0, count - 1) * gap;

    const positions = [];
    for (let i = 0; i < count; i++) {
      if (isPortraitContainer) {
        positions.push({
          index: i,
          x: padding + (innerWidth - tileWidth),
          y: padding + i * (tileHeight + gap),
          width: tileWidth,
          height: tileHeight,
          row: i,
          col: 0,
        });
      } else {
        positions.push({
          index: i,
          x: padding + i * (tileWidth + gap),
          y: padding + (innerHeight - tileHeight),
          width: tileWidth,
          height: tileHeight,
          row: 0,
          col: i,
        });
      }
    }

    const usedArea = positions.reduce((s, p) => s + p.width * p.height, 0);

    return {
      mode: 'filmstrip',
      rows: isPortraitContainer ? count : 1,
      columns: isPortraitContainer ? 1 : count,
      tileWidth,
      tileHeight,
      positions: this._attachParticipantIds(positions, participants),
      mainParticipantId: mainId,
      efficiency: usedArea / (innerWidth * innerHeight || 1),
      isOverflowing,
      scrollExtent: isOverflowing ? finalStripLength : null,
    };
  }

  /**
   * Lays out `count` tiles in a single row, max-fit by height, left-to-right,
   * starting at the given y offset. Used by speaker-mode's thumbnail strip.
   *
   * Tiles shrink to fit `availableWidth` only down to `minThumbnailFraction`
   * of their natural (height-driven) size — beyond that, sizing stays at
   * the floor and the row is reported as overflowing so the caller can
   * make the strip horizontally scrollable instead of rendering
   * illegibly-thin thumbnails.
   * @private
   * @returns {{ positions: TilePosition[], isOverflowing: boolean, rowLength: number }}
   */
  _layoutSingleRow(count, availableWidth, rowHeight, aspectRatio, gap, xOffset, yOffset) {
    if (count === 0) return { positions: [], isOverflowing: false, rowLength: 0 };

    const minThumbnailFraction = 0.4;
    const totalGap = gap * (count - 1);

    let tileHeight = rowHeight;
    let tileWidth = tileHeight * aspectRatio;
    let isOverflowing = false;

    const naturalRowWidth = tileWidth * count + totalGap;
    if (naturalRowWidth > availableWidth) {
      const shrinkFactor = (availableWidth - totalGap) / (naturalRowWidth - totalGap);
      if (shrinkFactor >= minThumbnailFraction) {
        tileWidth *= shrinkFactor;
        tileHeight *= shrinkFactor;
      } else {
        // Floor reached: keep natural size, let the row overflow/scroll.
        isOverflowing = true;
      }
    }

    const rowWidth = tileWidth * count + totalGap;
    const startX = isOverflowing ? xOffset : xOffset + (availableWidth - rowWidth) / 2;

    const positions = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        index: i + 1,
        x: startX + i * (tileWidth + gap),
        y: yOffset,
        width: tileWidth,
        height: tileHeight,
        row: 1,
        col: i,
      });
    }
    return { positions, isOverflowing, rowLength: rowWidth };
  }

  /**
   * Attaches `participantId` to each position object by matching index
   * order to the participants array, so consumers can map positions
   * back to their own data without re-deriving index semantics.
   * @private
   * @param {TilePosition[]} positions
   * @param {Participant[]} participants
   * @param {boolean} [alreadyTagged=false] - if true, positions[0] is assumed to already carry participantId (speaker mode's main tile).
   * @returns {Array<TilePosition & {participantId: string}>}
   */
  _attachParticipantIds(positions, participants, alreadyTagged = false) {
    return positions.map((pos, i) => {
      if (alreadyTagged && pos.participantId) return pos;
      const p = participants[pos.index !== undefined ? pos.index : i];
      return { ...pos, participantId: p ? p.id : null };
    });
  }
}

export default VideoGridEngine;
export { VideoGridEngine, VALID_MODES };
