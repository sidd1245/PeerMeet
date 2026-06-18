import {
    getUserMediaStream
}
    from "../media/mediaManager.js";

import {
    setLocalStream,
    getLocalStream,
    addCall,
    addRemoteStream,
    hasCall
}
    from "./callState.js";

import {
    renderLocalVideo,
    renderRemoteVideo
}
    from "./videoRenderer.js";

import {
    getScreenStream
}
    from "./screenShareState.js";

function getOutgoingStream() {

    const localStream =
        getLocalStream();

    const screenTrack =
        getScreenStream()
            ?.getVideoTracks()[0];

    if (
        !localStream ||
        !screenTrack ||
        screenTrack.readyState === "ended"
    ) {

        return localStream;

    }

    return new MediaStream([
        ...localStream.getAudioTracks(),
        screenTrack
    ]);

}

export async function initializeCalls() {

    try {

        const stream =
            await getUserMediaStream();

        setLocalStream(
            stream
        );

        renderLocalVideo(
            stream
        );

        console.log(
            "Local stream ready"
        );

        console.log(
            stream.getVideoTracks()
        );

    }
    catch(error) {

        console.error(
            error
        );

    }

}

export function setupIncomingCalls(
    peer
) {

    peer.on(
        "call",
        call => {

            const outgoingStream =
                getOutgoingStream();

            call.answer(
                outgoingStream
            );

            addCall(
                call.peer,
                call
            );

            call.on(
                "stream",
                remoteStream => {

                    addRemoteStream(
                        call.peer,
                        remoteStream
                    );

                    renderRemoteVideo(
                        call.peer,
                        remoteStream
                    );

                }
            );

        }
    );

}

export function callParticipant(
    peer,
    remotePeerId
) {
    if (
        hasCall(
            remotePeerId
        )
    ) {

        return;

    }

    const outgoingStream =
        getOutgoingStream();

    if (
        !outgoingStream
    ) {
        return;
    }

    const call =
        peer.call(
            remotePeerId,
            outgoingStream
        );

    addCall(
        remotePeerId,
        call
    );

    call.on(
        "stream",
        remoteStream => {

            addRemoteStream(
                remotePeerId,
                remoteStream
            );

            renderRemoteVideo(
                remotePeerId,
                remoteStream
            );

        }
    );

}

export function toggleMicrophone() {

    const stream =
        getLocalStream();

    if (!stream) {
        return;
    }

    const track =
        stream
            .getAudioTracks()[0];

    if (!track) {
        return;
    }

    track.enabled =
        !track.enabled;

    return track.enabled;

}

export function toggleCamera() {

    const stream =
        getLocalStream();

    if (!stream) {
        return;
    }

    const track =
        stream
            .getVideoTracks()[0];

    if (!track) {
        return;
    }

    track.enabled =
        !track.enabled;

    return track.enabled;

}
