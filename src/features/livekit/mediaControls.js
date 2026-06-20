import {
    getRoom
} from "./roomConnection.js";

export async function setMicrophoneEnabled(
    enabled
) {

    const room =
        getRoom();

    if (!room) {
        return;
    }

    await room.localParticipant
        .setMicrophoneEnabled(
            enabled
        );

}

export async function setCameraEnabled(
    enabled
) {

    const room =
        getRoom();

    if (!room) {
        return;
    }

    await room.localParticipant
        .setCameraEnabled(
            enabled
        );

}