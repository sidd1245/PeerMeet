import {
    getOrCreateVideoTile,
    removeVideoTile,
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

export function renderRemoteVideo(participantId,participantName, stream) {

    const video = getOrCreateVideoTile({
        id: `video-${participantId}`,
        label: participantName,
    });

    console.log(
        "Rendering video for:",
        participantId,
        stream
    );

    video.srcObject = stream;
    video.volume = 1;
    video.muted = false;

}

export function removeRemoteVideo(participantId) {

    removeVideoTile(`video-${participantId}`);

}
