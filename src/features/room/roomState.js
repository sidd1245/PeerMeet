import { state } from "../../app/store.js";

export function getRoomId() {
    return state.roomId;
}