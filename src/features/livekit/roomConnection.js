import {
    Room, RoomEvent, ConnectionState, createLocalVideoTrack, createLocalAudioTrack
} from "livekit-client";

import {
    renderRemoteVideo, removeRemoteVideo, renderLocalVideo
} from "../call/videoRenderer.js";

import {
    setActiveSpeaker
} from "../participants/activeSpeakerState.js";

import {
    showAvatar, hideAvatar, setMicMuted, setMicUnmuted,
    getOrCreatePresentationStage, removePresentationStage
} from "../../components/VideoGrid/VideoGrid.js";

let room = null;
let onScreenShareStopped = null;

export function setScreenShareStoppedHandler(handler) {
    onScreenShareStopped = handler;
}

export async function connectRoom({
                                      roomName, identity, name, onReconnecting, onReconnected, onDisconnected
                                  }) {

    const response = await fetch("http://localhost:3000/api/livekit/token", {
        method: "POST", headers: {
            "Content-Type": "application/json"
        }, body: JSON.stringify({
            roomName, identity, name
        })
    });

    const data = await response.json();

    console.log("LiveKit token response:", data);

    const {
        token, url
    } = data;

    room = new Room();

    room.on(RoomEvent.LocalTrackPublished, publication => {

        console.log("LOCAL TRACK PUBLISHED:", publication.kind);

        if (publication.source !== "screen_share" || !publication.track) {
            return;
        }

        const stream = new MediaStream([publication.track.mediaStreamTrack]);

        renderLocalScreenShare(stream);

    });

    room.on(RoomEvent.LocalTrackUnpublished, publication => {

        if (publication.source !== "screen_share") {
            return;
        }

        removePresentationStage(room.localParticipant.identity);

        onScreenShareStopped?.();

    });

    room.on("connected", () => {
        console.log("LIVEKIT CONNECTED");
    });

    room.on("disconnected", () => {
        console.log("LIVEKIT DISCONNECTED");
    });

    room.on(RoomEvent.ConnectionStateChanged, state => {

        if (state === ConnectionState.SignalReconnecting || state === ConnectionState.Reconnecting) {

            onReconnecting?.();

        }

        if (state === ConnectionState.Connected) {

            onReconnected?.();

        }

        if (state === ConnectionState.Disconnected) {

            onDisconnected?.();

        }
    });

    console.log("Connecting to:", url);
    console.log("Room:", roomName);
    console.log("Identity:", identity);

    room.on(RoomEvent.ParticipantConnected, participant => {

        console.log("Participant connected:", participant.identity);

    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {

        console.log("SUBSCRIBED", publication.source, track.kind, participant.identity);

        if (participant.identity === room.localParticipant.identity) {
            return;
        }

        if (track.kind !== "video") {
            return;
        }

        const mediaStream = new MediaStream([track.mediaStreamTrack]);

        if (publication.source === "screen_share") {

            renderRemoteScreenShare(participant.identity, participant.name || participant.identity, mediaStream);

            return;

        }

        renderRemoteVideo(participant.identity, participant.name || participant.identity, mediaStream);

    });

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {

        console.log("UNSUBSCRIBED", track.kind, publication.source, participant.identity);

        if (publication.source === "screen_share") {

            removePresentationStage(participant.identity);

            return;

        }

        if (track.kind !== "video") {
            return;
        }

        removeRemoteVideo(participant.identity);

    });

    room.on(RoomEvent.TrackMuted, (publication, participant) => {

        if (publication.kind === "video" && publication.source === "camera") {

            showAvatar(`video-${participant.identity}`);

        }

        if (publication.kind === "audio") {

            setMicMuted(`video-${participant.identity}`);

        }
    });

    room.on(RoomEvent.TrackUnmuted, (publication, participant) => {

        if (participant.identity === room.localParticipant.identity) {
            return;
        }

        if (publication.kind === "audio") {

            setMicUnmuted(`video-${participant.identity}`);

            return;
        }

        if (publication.kind !== "video" || publication.source !== "camera" || !publication.track) {
            return;
        }

        const stream = new MediaStream([publication.track.mediaStreamTrack]);

        hideAvatar(`video-${participant.identity}`);

        renderRemoteVideo(participant.identity, participant.name || participant.identity, stream);

    });

    await room.connect(url, token);

    await room.localParticipant.enableCameraAndMicrophone();

    const localPublication = [...room.localParticipant.videoTrackPublications.values()][0];

    const localTrack = localPublication?.track;

    if (localTrack) {

        const localStream = new MediaStream([localTrack.mediaStreamTrack]);

        renderLocalVideo(localStream);

    }
    console.log("Camera and microphone published");

    room.remoteParticipants.forEach(participant => {

        console.log("Existing participant:", participant.identity);

        participant.trackPublications.forEach(publication => {

            console.log("Existing publication:", publication.kind, publication.isSubscribed);

        });

    });

    room.on(RoomEvent.ActiveSpeakersChanged, speakers => {

        if (speakers.length > 0) {
            console.log("Active speaker:", speakers[0]?.identity);
            setActiveSpeaker(speakers[0].identity);
        } else {
            setActiveSpeaker(null);
        }

    });

    console.log("Remote participants after join:", room.remoteParticipants.size);

    return room;
}

function getLocalCameraPublication() {

    return [...room.localParticipant.videoTrackPublications.values()]
        .find(pub => pub.source === "camera");

}

export function getRoom() {
    return room;
}

export async function disconnectRoom() {

    if (!room) {
        return;
    }

    await room.disconnect();

    room = null;
}

export async function toggleMicrophone() {

    if (!room) {
        return;
    }

    const enabled = room.localParticipant.isMicrophoneEnabled;

    await room.localParticipant.setMicrophoneEnabled(!enabled);

    return !enabled;

}

export async function toggleCamera() {

    if (!room) {
        return;
    }

    const enabled = room.localParticipant.isCameraEnabled;

    await room.localParticipant.setCameraEnabled(!enabled);

    if (!enabled) {
        refreshLocalVideo();
    }

    return !enabled;

}

export async function toggleScreenShare() {

    if (!room) {
        return false;
    }

    const enabled = room.localParticipant.isScreenShareEnabled;

    await room.localParticipant.setScreenShareEnabled(!enabled);

    return !enabled;

}

function refreshLocalVideo() {

    const publication = getLocalCameraPublication();

    const track = publication?.track;

    if (!track) {
        return;
    }

    const stream = new MediaStream([track.mediaStreamTrack]);

    renderLocalVideo(stream);

}

function renderLocalScreenShare(stream) {

    const video = getOrCreatePresentationStage({
        id: room.localParticipant.identity, label: "You"
    });

    video.srcObject = stream;

}

function renderRemoteScreenShare(identity, label, stream) {

    const video = getOrCreatePresentationStage({
        id: identity, label
    });

    video.srcObject = stream;

}

export async function switchCamera(deviceId) {

    if (!room) {
        return;
    }

    const track = await createLocalVideoTrack({
        deviceId
    });

    const publication = getLocalCameraPublication();

    const oldTrack = publication?.track;

    if (oldTrack) {
        await room.localParticipant.unpublishTrack(oldTrack);
        oldTrack.stop();
    }

    await room.localParticipant.publishTrack(track);

    const stream = new MediaStream([track.mediaStreamTrack]);

    renderLocalVideo(stream);

}

export async function switchMicrophone(deviceId) {

    if (!room) {
        return;
    }

    const track = await createLocalAudioTrack({
        deviceId
    });

    const publication = [...room.localParticipant.audioTrackPublications.values()][0];

    const oldTrack = publication.track;

    await room.localParticipant.unpublishTrack(oldTrack);

    oldTrack.stop();

    await room.localParticipant.publishTrack(track);

}
