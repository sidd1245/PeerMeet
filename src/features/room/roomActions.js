import { state } from "../../app/store.js";

export function setRoomId(roomId) {

    state.roomId =
        roomId;

}

export function clearParticipants() {

    state.participants.clear();

}