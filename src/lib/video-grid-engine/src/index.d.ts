/**
 * Type definitions for video-grid-engine.
 * These mirror the JSDoc annotations in the source files and are hand
 * verified against the implementation — not auto-generated — so they
 * stay readable as documentation in their own right.
 */

export type LayoutMode = 'grid' | 'speaker' | 'presentation' | 'filmstrip';

export interface Participant {
  /** Unique participant/track identifier. */
  id: string;
  /** True if this participant is the active screen-share source. */
  isScreenSharing?: boolean;
  /** True if this participant is the current active/dominant speaker. */
  isActiveSpeaker?: boolean;
  /** True if the local user has pinned this participant. */
  isPinned?: boolean;
  /** Per-tile override aspect ratio (width / height). */
  aspectRatio?: number;
}

export interface TilePosition {
  /** Index into the positions array / matching participant order. */
  index: number;
  /** The id of the participant this tile represents (null if unresolved). */
  participantId: string | null;
  /** Left offset in px, relative to the container's top-left corner. */
  x: number;
  /** Top offset in px, relative to the container's top-left corner. */
  y: number;
  /** Tile width in px. */
  width: number;
  /** Tile height in px. */
  height: number;
  /** Row index (0-based) the tile occupies. */
  row: number;
  /** Column index (0-based) the tile occupies. */
  col: number;
}

export interface LayoutResult {
  /** The mode that produced this layout. */
  mode: LayoutMode;
  /** Rows in the main grid region. */
  rows: number;
  /** Columns in the main grid region. */
  columns: number;
  /** Width of a standard grid tile, in px. */
  tileWidth: number;
  /** Height of a standard grid tile, in px. */
  tileHeight: number;
  /** Every visible tile's position/size. */
  positions: TilePosition[];
  /** In speaker/presentation mode, the id of the large/main tile. Null in grid/filmstrip. */
  mainParticipantId: string | null;
  /** Fraction (0..1) of container area covered by tiles. Diagnostic only. */
  efficiency: number;
  /** Filmstrip/speaker strip only: true if tiles exceed available space and the caller should render a scrollable strip. */
  isOverflowing: boolean;
  /** Total strip length in px when isOverflowing is true; null otherwise. */
  scrollExtent: number | null;
}

export interface CalculateLayoutParams {
  /** Convenience form: number of anonymous participants. Ignored if `participants` is provided. */
  participantCount?: number;
  /** Full participant list. Preferred when you need screen-share/speaker/pin metadata. */
  participants?: Participant[];
  /** Available width in px. */
  containerWidth: number;
  /** Available height in px. */
  containerHeight: number;
  /** Per-tile aspect ratio (width / height). Defaults to the engine's configured default (16/9). */
  aspectRatio?: number;
  /** Px gap between tiles. Defaults to the engine's configured default. */
  gap?: number;
  /** Px padding from container edges. Defaults to the engine's configured default. */
  padding?: number;
}

export interface VideoGridEngineConfig {
  aspectRatio?: number;
  gap?: number;
  padding?: number;
  mode?: LayoutMode;
  filmstripVisibleCount?: number;
  filmstripFraction?: number;
  mainStageFraction?: number;
}

export declare class VideoGridEngine {
  constructor(config?: VideoGridEngineConfig);

  setLayoutMode(mode: LayoutMode): void;
  getLayoutMode(): LayoutMode;

  setPinnedParticipant(participantId: string | null): void;
  getPinnedParticipant(): string | null;

  invalidate(): void;

  calculateLayout(params: CalculateLayoutParams): LayoutResult;
  resize(params: CalculateLayoutParams): Promise<LayoutResult>;

  onLayoutChange(listener: (result: LayoutResult) => void): () => void;
}

export default VideoGridEngine;

export declare const VALID_MODES: LayoutMode[];

// --- LayoutCalculator exports (lower-level, for advanced consumers) ---

export declare const DEFAULT_GAP: number;
export declare const DEFAULT_ASPECT_RATIO: number;

export declare function fitGridForCount(params: {
  count: number;
  containerWidth: number;
  containerHeight: number;
  aspectRatio?: number;
  gap?: number;
}): {
  rows: number;
  columns: number;
  tileWidth: number;
  tileHeight: number;
  positions: TilePosition[];
  usedArea: number;
  containerArea: number;
  efficiency: number;
};

export declare function fitSingleTile(params: {
  regionWidth: number;
  regionHeight: number;
  regionX: number;
  regionY: number;
  aspectRatio?: number;
  padding?: number;
}): { x: number; y: number; width: number; height: number };

export declare function getOrientation(
  containerWidth: number,
  containerHeight: number
): 'landscape' | 'portrait' | 'square';

// --- LayoutPresets exports ---

export declare const PRESET_COUNTS: number[];
export declare function hasPreset(count: number): boolean;
export declare function getPresetLayout(
  count: number,
  options: {
    containerWidth: number;
    containerHeight: number;
    aspectRatio?: number;
    gap?: number;
    padding?: number;
  }
): TilePosition[];
