import {
    getCalls, getLocalStream
} from "./callState.js";

import {
    setScreenStream, clearScreenStream, //getScreenStream
} from "./screenShareState.js";

import {getDisplayMedia} from "../media/screenShareManager.js";

import {socket} from "../../services/socket.js";

import {getUser} from "../../services/storage.js";

//let onScreenShareStopped = null;

// export function setScreenShareStoppedCallback(callback) {
//
//     onScreenShareStopped = callback;
//
// }

export async function startScreenSharing() {

    try {

        const screenStream = await getDisplayMedia();

        const screenTrack = screenStream
            .getVideoTracks()[0];

        if (!screenTrack) {
            return false;
        }

        setScreenStream(screenStream);

        const user = getUser();

        socket.emit("screen-share-started", {
            roomId: document
                .getElementById("currentRoom").textContent,

            userName: user.name
        });

        const localVideo = document.getElementById("localVideo");

        if (localVideo) {

            localVideo.srcObject = screenStream;

        }

        getCalls().forEach(call => {

            const sender = call.peerConnection
                ?.getSenders()
                ?.find(sender => sender.track && sender.track.kind === "video");

            if (sender) {

                sender.replaceTrack(screenTrack)
                    .catch(console.error);

            }

        });

        screenTrack.onended = async () => {

            const cameraTrack = getLocalStream()
                ?.getVideoTracks()[0];

            getCalls().forEach(call => {

                const sender = call.peerConnection
                    ?.getSenders()
                    ?.find(sender => sender.track && sender.track.kind === "video");

                if (sender && cameraTrack) {

                    sender.replaceTrack(cameraTrack)
                        .catch(console.error);

                }

            });

            clearScreenStream();

            const user = getUser();

            socket.emit("screen-share-stopped", {
                roomId: document
                    .getElementById("currentRoom").textContent,

                userName: user.name
            });

            const localVideo = document.getElementById("localVideo");

            if (localVideo) {

                localVideo.srcObject = getLocalStream();

            }

            console.log("Returned to camera");

            // if (onScreenShareStopped) {
            //
            //     onScreenShareStopped();
            //
            // }

        };

        console.log("Screen sharing started");

        return true;

    } catch (error) {

        console.error(error);

        return false;

    }

}

// export function stopScreenSharing() {
//
//     const screenStream = getScreenStream();
//
//     if (!screenStream) {
//         return;
//     }
//
//     const screenTrack = screenStream
//         .getVideoTracks()[0];
//
//     if (screenTrack) {
//
//         screenTrack.stop();
//
//     }
//
// }

