import { state } from "../../app/store.js";

export function getParticipants() {
    return state.participants;
}