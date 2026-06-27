/**
 * webrtc-integration.js
 *
 * Drives VideoGridEngine from a hand-rolled WebRTC mesh (no SFU/SDK) —
 * the kind of setup you'd have with a simple signaling server and one
 * RTCPeerConnection per remote peer. As with the LiveKit example, the
 * engine doesn't know or care that WebRTC exists; this file's only job
 * is translating "peer connections + MediaStreams" into the engine's
 * generic Participant[] shape.
 *
 * This example assumes you already have signaling (offer/answer/ICE
 * exchange) working and focuses purely on the layout-relevant parts:
 * tracking peers, detecting who's speaking via Web Audio, and rendering.
 */

import VideoGridEngine from '../src/VideoGridEngine.js';

const container = document.getElementById('call-container');
container.classList.add('vge-container');

const engine = new VideoGridEngine({ aspectRatio: 16 / 9, gap: 8 });

/**
 * @typedef {Object} Peer
 * @property {string} id
 * @property {RTCPeerConnection} connection
 * @property {MediaStream} [remoteStream]
 * @property {boolean} isScreenSharing
 * @property {boolean} isSpeaking
 */

/** @type {Map<string, Peer>} */
const peers = new Map();
const localId = 'local';
let localStream = null;
let localIsScreenSharing = false;

const tileElements = new Map();
const audioAnalysers = new Map();

/**
 * Builds the engine's generic Participant[] from local + remote peer state.
 */
function buildParticipantList() {
  const list = [
    { id: localId, isScreenSharing: localIsScreenSharing, isActiveSpeaker: audioAnalysers.get(localId)?.isSpeaking ?? false },
  ];
  for (const peer of peers.values()) {
    list.push({
      id: peer.id,
      isScreenSharing: peer.isScreenSharing,
      isActiveSpeaker: peer.isSpeaking,
    });
  }
  return list;
}

function relayout() {
  const participants = buildParticipantList();
  const layout = engine.calculateLayout({
    participants,
    containerWidth: container.clientWidth,
    containerHeight: container.clientHeight,
  });
  render(layout);
}

/**
 * @param {import('../src/index.d.ts').LayoutResult} layout
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

function createTileElement(id) {
  const el = document.createElement('div');
  el.className = 'vge-tile';
  el.dataset.participantId = id;

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = id === localId;

  if (id === localId && localStream) {
    video.srcObject = localStream;
  } else {
    const peer = peers.get(id);
    if (peer && peer.remoteStream) video.srcObject = peer.remoteStream;
  }

  el.appendChild(video);

  const label = document.createElement('div');
  label.className = 'vge-tile-label';
  label.textContent = id;
  el.appendChild(label);

  return el;
}

/**
 * Lightweight active-speaker detection using the Web Audio API — useful
 * when you're not using an SFU that already computes this for you.
 * Polls audio level via an AnalyserNode and flags `isSpeaking` above a
 * simple volume threshold. Good enough for layout purposes; swap for a
 * VAD library if you need higher accuracy.
 * @param {string} id
 * @param {MediaStream} stream
 */
function attachSpeakingDetector(id, stream) {
  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack) return;

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);
  const state = { isSpeaking: false };
  audioAnalysers.set(id, state);

  const SPEAKING_THRESHOLD = 18; // tune per deployment

  function poll() {
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
    const wasSpeaking = state.isSpeaking;
    state.isSpeaking = avg > SPEAKING_THRESHOLD;

    if (state.isSpeaking !== wasSpeaking) {
      const peer = peers.get(id);
      if (peer) peer.isSpeaking = state.isSpeaking;
      relayout();
    }

    requestAnimationFrame(poll);
  }
  poll();
}

/**
 * Call this once you've completed signaling and have an open
 * RTCPeerConnection + remote MediaStream for a new peer.
 * @param {string} id
 * @param {RTCPeerConnection} connection
 * @param {MediaStream} remoteStream
 */
export function addPeer(id, connection, remoteStream) {
  peers.set(id, { id, connection, remoteStream, isScreenSharing: false, isSpeaking: false });
  attachSpeakingDetector(id, remoteStream);
  relayout();
}

/**
 * Call when a peer's connection closes / they leave the call.
 * @param {string} id
 */
export function removePeer(id) {
  peers.delete(id);
  audioAnalysers.delete(id);
  relayout();
}

/**
 * Call when a peer starts/stops screen-sharing (you'll know this from
 * a signaling message, since plain WebRTC has no built-in concept of
 * "this track is a screen share" beyond what you label it as).
 * @param {string} id
 * @param {boolean} isSharing
 */
export function setPeerScreenSharing(id, isSharing) {
  const peer = peers.get(id);
  if (peer) peer.isScreenSharing = isSharing;
  engine.setLayoutMode(isSharing ? 'presentation' : 'grid');
  relayout();
}

/**
 * Initializes the local camera preview tile. Call once after
 * getUserMedia() resolves.
 * @param {MediaStream} stream
 */
export function setLocalStream(stream) {
  localStream = stream;
  attachSpeakingDetector(localId, stream);
  relayout();
}

// --- Resize handling ---
const resizeObserver = new ResizeObserver(() => {
  engine
    .resize({
      participants: buildParticipantList(),
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
    })
    .then(render);
});
resizeObserver.observe(container);

// --- Example wiring (pseudocode for your signaling layer) ---
// const pc = new RTCPeerConnection(iceServers);
// pc.ontrack = (event) => addPeer(remotePeerId, pc, event.streams[0]);
// const localMedia = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
// setLocalStream(localMedia);
