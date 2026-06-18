import { state } from "../../app/store.js";

export function addNotification(message) {

    state.notifications.push({
        id: crypto.randomUUID(),
        message,
        timestamp: Date.now()
    });

}