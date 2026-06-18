// screenShareManager.js

// export async function startScreenShare() {
//     return navigator.mediaDevices.getDisplayMedia({
//         video: true
//     });
// }

export function getScreenTrack(screenStream) {
    return screenStream.getVideoTracks()[0];
}

export function stopScreenShare(screenStream) {
    screenStream
        ?.getTracks()
        .forEach(track => track.stop());
}

export async function getDisplayMedia() {

    return await navigator
        .mediaDevices
        .getDisplayMedia({
            video: true
        });

}