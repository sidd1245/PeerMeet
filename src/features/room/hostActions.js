export function isHost(
    room
) {

    return (
        room.hostId ===
        room.mySocketId
    );

}