let currentCall = null;

export function startCall(
    peer,
    remotePeerId,
    stream
) {

    currentCall =
        peer.call(
            remotePeerId,
            stream
        );

    return currentCall;
}

export function answerCall(
    call,
    stream
) {

    call.answer(stream);
}

export function endCall() {

    if (currentCall) {

        currentCall.close();

        currentCall = null;
    }
}

export function getCurrentCall() {
    return currentCall;
}