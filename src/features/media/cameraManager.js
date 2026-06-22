// // cameraManager.js
//
// export async function getVideoDevices() {
//     const devices =
//         await navigator.mediaDevices.enumerateDevices();
//
//     return devices.filter(
//         device => device.kind === "videoinput"
//     );
// }
//
// export async function getCameraStream(
//     deviceId
// ) {
//     return navigator.mediaDevices.getUserMedia({
//         video: {
//             deviceId: {
//                 exact: deviceId
//             }
//         },
//         audio: true
//     });
// }
//
// export async function switchCamera(currentStream,deviceId) {
//     currentStream
//         ?.getVideoTracks()
//         .forEach(track => track.stop());
//
//     return getCameraStream(deviceId);
// }
//
