/**
 * React.jsx
 *
 * React integration for VideoGridEngine, structured as:
 *   - useVideoGridLayout(): a hook that owns the engine instance,
 *     observes container size via ResizeObserver, and returns the
 *     latest LayoutResult.
 *   - <VideoGrid>: a component that renders that layout into absolutely
 *     positioned tiles.
 *
 * The engine instance is created once (useRef) and never recreated on
 * re-render — React's render cycle and the engine's calculation cycle
 * are deliberately decoupled, which is what keeps this fast even with
 * 100+ participants re-rendering on every speaking-state change.
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import VideoGridEngine from '../src/VideoGridEngine.js';

/**
 * @param {Object} options
 * @param {import('../src/index.d.ts').Participant[]} options.participants
 * @param {import('../src/index.d.ts').LayoutMode} [options.mode='grid']
 * @param {string|null} [options.pinnedParticipantId=null]
 * @param {number} [options.aspectRatio=16/9]
 * @param {number} [options.gap=8]
 * @returns {{ containerRef: React.RefObject, layout: import('../src/index.d.ts').LayoutResult | null }}
 */
export function useVideoGridLayout({
  participants,
  mode = 'grid',
  pinnedParticipantId = null,
  aspectRatio = 16 / 9,
  gap = 8,
}) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const [layout, setLayout] = useState(null);

  // Engine is created exactly once per component instance.
  if (!engineRef.current) {
    engineRef.current = new VideoGridEngine({ aspectRatio, gap, mode });
  }

  // Keep mode/pin state on the engine in sync with props, without
  // recreating the engine (which would lose its internal cache).
  useEffect(() => {
    engineRef.current.setLayoutMode(mode);
  }, [mode]);

  useEffect(() => {
    engineRef.current.setPinnedParticipant(pinnedParticipantId);
  }, [pinnedParticipantId]);

  const recalculate = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const result = engineRef.current.calculateLayout({
      participants,
      containerWidth: el.clientWidth,
      containerHeight: el.clientHeight,
    });
    setLayout(result);
  }, [participants]);

  // Recalculate whenever participants/mode/pin changes.
  useEffect(() => {
    recalculate();
  }, [recalculate]);

  // Recalculate on container resize, via the engine's rAF-coalesced
  // resize() so rapid resize events don't cause redundant React renders.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      engineRef.current
        .resize({
          participants,
          containerWidth: el.clientWidth,
          containerHeight: el.clientHeight,
        })
        .then(setLayout);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [participants]);

  return { containerRef, layout };
}

/**
 * Renders a LayoutResult as absolutely-positioned tiles. Pass a
 * `renderTile` function to control what's inside each tile (video
 * element, name label, mute icon, etc.) — this component only handles
 * positioning/sizing.
 *
 * @param {Object} props
 * @param {import('../src/index.d.ts').Participant[]} props.participants
 * @param {import('../src/index.d.ts').LayoutMode} [props.mode]
 * @param {string|null} [props.pinnedParticipantId]
 * @param {function(participant: Object, position: import('../src/index.d.ts').TilePosition): React.ReactNode} props.renderTile
 */
export function VideoGrid({ participants, mode = 'grid', pinnedParticipantId = null, renderTile }) {
  const { containerRef, layout } = useVideoGridLayout({ participants, mode, pinnedParticipantId });

  const participantsById = useMemo(() => {
    const map = new Map();
    for (const p of participants) map.set(p.id, p);
    return map;
  }, [participants]);

  return (
    <div ref={containerRef} className={`vge-container ${layout?.isOverflowing ? 'vge-container--scrollable' : ''}`}>
      {layout?.positions.map((pos) => {
        const participant = participantsById.get(pos.participantId);
        return (
          <div
            key={pos.participantId}
            className={`vge-tile ${pos.participantId === layout.mainParticipantId ? 'vge-tile--main' : ''}`}
            style={{
              '--vge-x': `${pos.x}px`,
              '--vge-y': `${pos.y}px`,
              '--vge-w': `${pos.width}px`,
              '--vge-h': `${pos.height}px`,
            }}
          >
            {renderTile(participant, pos)}
          </div>
        );
      })}
    </div>
  );
}

// --- Example usage in a parent component ---
//
// function CallScreen({ roomParticipants }) {
//   const [mode, setMode] = useState('grid');
//   const [pinnedId, setPinnedId] = useState(null);
//
//   return (
//     <>
//       <ModeSwitcher mode={mode} onChange={setMode} />
//       <VideoGrid
//         participants={roomParticipants}
//         mode={mode}
//         pinnedParticipantId={pinnedId}
//         renderTile={(participant, pos) => (
//           <>
//             <video ref={(el) => attachStream(el, participant.id)} autoPlay playsInline muted={participant.id === 'local'} />
//             <div className="vge-tile-label">{participant.displayName}</div>
//           </>
//         )}
//       />
//     </>
//   );
// }
