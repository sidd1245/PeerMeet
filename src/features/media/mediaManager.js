// mediaManager.js

export async function getUserMediaStream(
    constraints = {
        video: true,
        audio: true
    }
) {
    return navigator.mediaDevices.getUserMedia(
        constraints
    );
}

export function stopStream(stream) {
    if (!stream) return;

    stream.getTracks().forEach(track => {
        track.stop();
    });
}