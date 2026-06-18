import { state } from "../../app/store.js";

export function getNotifications() {
    return state.notifications;
}