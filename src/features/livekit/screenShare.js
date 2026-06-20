import {
    getRoom
} from "./roomConnection.js";

export async function startScreenShare() {

    const room =
        getRoom();

    if (!room) {
        return false;
    }

    await room.localParticipant
        .setScreenShareEnabled(
            true
        );

    return true;
}

export async function stopScreenShare() {

    const room =
        getRoom();

    if (!room) {
        return;
    }

    await room.localParticipant
        .setScreenShareEnabled(
            false
        );

}