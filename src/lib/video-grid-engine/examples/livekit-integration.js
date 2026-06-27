/**
 * livekit-integration.js
 *
 * Shows how to drive VideoGridEngine from a LiveKit Room. The key idea:
 * LiveKit already gives you participant join/leave events, speaking
 * detection, and screen-share track publication — this file just maps
 * that LiveKit-specific state into the engine's generic Participant
 * shape ({ id, isActiveSpeaker, isScreenSharing, isPinned }) and feeds
 * it through calculateLayout(). The engine itself has zero LiveKit
 * imports/knowledge, so this same pattern works for any SFU.
 *
 * Assumes the `livekit-client` package is installed in your project:
 *   npm install livekit-client
 */

import { Room, RoomEvent, Track } from 'livekit-client';
import VideoGridEngine from '../src/VideoGridEngine.js';

const container = document.getElementById('call-container');
container.classList.add('vge-container');

const engine = new VideoGridEngine({ aspectRatio: 16 / 9, gap: 8 });
const tileElements = new Map();
let pinnedParticipantId = null;

const room = new Room({
  adaptiveStream: true,
  dynacast: true,
});

/**
 * Builds the engine's Participant[] from the current LiveKit room state.
 * Called any time something layout-relevant changes (join, leave, speaking
 * change, screen-share start/stop).
 * @returns {import('../src/index.d.ts').Participant[]}
 */
function buildParticipantList() {
  const all = [room.localParticipant, ...room.remoteParticipants.values()];

  return all.map((p) => {
    const screenShareTrack = p.getTrackPublication(Track.Source.ScreenShare);
    return {
      id: p.identity,
      isActiveSpeaker: p.isSpeaking,
      isScreenSharing: Boolean(screenShareTrack && !screenShareTrack.isMuted),
      isPinned: p.identity === pinnedParticipantId,
    };
  });
}

/**
 * If anyone is screen-sharing, switch to presentation mode automatically;
 * otherwise fall back to speaker mode if there's an active pin/speaker
 * worth highlighting, else plain grid. This kind of auto-mode-switching
 * is exactly what setLayoutMode() is designed to support cleanly.
 */
function resolveAutomaticMode(participants) {
  if (participants.some((p) => p.isScreenSharing)) return 'presentation';
  if (pinnedParticipantId) return 'speaker';
  return 'grid';
}

function relayout() {
  const participants = buildParticipantList();
  engine.setLayoutMode(resolveAutomaticMode(participants));

  const layout = engine.calculateLayout({
    participants,
    containerWidth: container.clientWidth,
    containerHeight: container.clientHeight,
  });

  renderLayout(layout, participants);
}

/**
 * @param {import('../src/index.d.ts').LayoutResult} layout
 * @param {import('../src/index.d.ts').Participant[]} participants
 */
function renderLayout(layout, participants) {
  const seenIds = new Set();

  for (const pos of layout.positions) {
    seenIds.add(pos.participantId);
    let tile = tileElements.get(pos.participantId);
    if (!tile) {
      tile = createTileElement(pos.participantId);
      tileElements.set(pos.participantId, tile);
      container.appendChild(tile);
      attachLiveKitTracks(pos.participantId, tile);
    }

    tile.classList.toggle('vge-tile--main', pos.participantId === layout.mainParticipantId);
    tile.classList.toggle('vge-tile--pinned', pos.participantId === pinnedParticipantId);

    const participant = participants.find((p) => p.id === pos.participantId);
    tile.classList.toggle('vge-tile--speaking', Boolean(participant && participant.isActiveSpeaker));
    tile.classList.toggle('vge-tile--screen-share', Boolean(participant && participant.isScreenSharing));

    tile.style.setProperty('--vge-x', `${pos.x}px`);
    tile.style.setProperty('--vge-y', `${pos.y}px`);
    tile.style.setProperty('--vge-w', `${pos.width}px`);
    tile.style.setProperty('--vge-h', `${pos.height}px`);
  }

  for (const [id, el] of tileElements) {
    if (!seenIds.has(id)) {
      el.remove();
      tileElements.delete(id);
    }
  }
}

function createTileElement(identity) {
  const el = document.createElement('div');
  el.className = 'vge-tile';
  el.dataset.participantId = identity;

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  el.appendChild(video);

  const label = document.createElement('div');
  label.className = 'vge-tile-label';
  label.textContent = identity;
  el.appendChild(label);

  el.addEventListener('dblclick', () => {
    pinnedParticipantId = pinnedParticipantId === identity ? null : identity;
    relayout();
  });

  return el;
}

/**
 * Finds the LiveKit participant by identity and attaches their camera
 * (or screen-share, if active) track to the tile's <video> element.
 * @param {string} identity
 * @param {HTMLElement} tile
 */
function attachLiveKitTracks(identity, tile) {
  const participant =
    room.localParticipant.identity === identity
      ? room.localParticipant
      : room.remoteParticipants.get(identity);
  if (!participant) return;

  const screenShare = participant.getTrackPublication(Track.Source.ScreenShare);
  const camera = participant.getTrackPublication(Track.Source.Camera);
  const publication = screenShare && !screenShare.isMuted ? screenShare : camera;

  if (publication && publication.track) {
    publication.track.attach(tile.querySelector('video'));
  }
}

// --- Wire up LiveKit room events that should trigger a relayout ---
room.on(RoomEvent.ParticipantConnected, relayout);
room.on(RoomEvent.ParticipantDisconnected, relayout);
room.on(RoomEvent.TrackPublished, relayout);
room.on(RoomEvent.TrackUnpublished, relayout);
room.on(RoomEvent.ActiveSpeakersChanged, relayout);
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  const tile = tileElements.get(participant.identity);
  if (tile) track.attach(tile.querySelector('video'));
  relayout();
});

// Resize handling — same rAF-coalesced pattern as the vanilla example.
const resizeObserver = new ResizeObserver(() => {
  const participants = buildParticipantList();
  engine
    .resize({
      participants,
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
    })
    .then((layout) => renderLayout(layout, participants));
});
resizeObserver.observe(container);

// --- Connect ---
// await room.connect(LIVEKIT_URL, TOKEN);
// await room.localParticipant.enableCameraAndMicrophone();
// relayout();
