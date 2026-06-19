import {
    getOrCreateVideoTile,
    removeVideoTile
} from "../../components/VideoGrid/VideoGrid.js";

export function renderLocalVideo(stream) {

    const video = getOrCreateVideoTile({
        id: "localVideo",
        label: "You",
        isLocal: true
    });

    video.srcObject = stream;

    video.play()
        .catch(console.error);

}

export function renderRemoteVideo(peerId, stream) {

    const video = getOrCreateVideoTile({
        id: `video-${peerId}`,
        label: "Guest"
    });

    video.srcObject = stream;
    video.volume = 1;
    video.muted = false;

}

export function removeRemoteVideo(peerId) {

    removeVideoTile(`video-${peerId}`);

}
