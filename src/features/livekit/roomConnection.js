import {
    Room,
    RoomEvent
} from "livekit-client";

let room = null;

export async function connectRoom({
                                      roomName,
                                      identity
                                  }) {

    const response = await fetch(
        "http://localhost:3000/api/livekit/token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                roomName,
                identity
            })
        }
    );

    const {
        token,
        url
    } = await response.json();

    room = new Room();

    await room.connect(
        url,
        token
    );

    return room;
}

export function getRoom() {
    return room;
}

export async function disconnectRoom() {

    if (!room) {
        return;
    }

    await room.disconnect();

    room = null;
}