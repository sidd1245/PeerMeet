export function isHost(
    room
) {

    return (
        room.hostUserId ===
        room.mySocketId
    );

}