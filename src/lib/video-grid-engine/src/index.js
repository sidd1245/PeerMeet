/**
 * @file index.js
 * @description Single entry point for the package. Consumers can import
 * everything they need from here:
 *
 *   import VideoGridEngine from 'video-grid-engine';
 *   import { fitGridForCount, hasPreset } from 'video-grid-engine';
 */

export { default, VideoGridEngine, VALID_MODES } from './VideoGridEngine.js';
export * from './LayoutCalculator.js';
export * from './LayoutPresets.js';
