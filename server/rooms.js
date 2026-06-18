const rooms = new Map();

export function joinRoom(roomId, participant) {

    if (!rooms.has(roomId)) {

        rooms.set(roomId, {
            hostId: participant.socketId,

            participants: [{
                ...participant, handRaised: false
            }]
        });

        return rooms.get(roomId);

    }

    const room = rooms.get(roomId);

    room.participants.push({
        ...participant, handRaised: false
    });

    return room;

}

export function removeParticipant(socketId) {

    let roomIdFound = null;

    let roomData = null;

    let leftParticipant = null;

    rooms.forEach((room, roomId) => {

        const participant = room.participants.find(participant => participant.socketId === socketId);

        if (participant) {

            leftParticipant = participant;

        }

        const filtered = room.participants.filter(participant => participant.socketId !== socketId);

        if (filtered.length !== room.participants.length) {

            roomIdFound = roomId;

            if (filtered.length === 0) {

                rooms.delete(roomId);

                roomData = null;

            } else {

                if (room.hostId === socketId) {

                    room.hostId = filtered[0].socketId;

                }

                room.participants = filtered;

                roomData = room;

            }

        }

    });

    return {

        roomId: roomIdFound,

        room: roomData,

        leftParticipant

    };

}

export function getRoom(roomId) {

    return rooms.get(roomId);

}

export function deleteRoom(roomId) {

    rooms.delete(roomId);

}

export function isHost(roomId, socketId) {

    const room = rooms.get(roomId);

    if (!room) {
        return false;
    }

    return (room.hostId === socketId);

}

export function setHandRaised(roomId, userId, handRaised) {

    const room = rooms.get(roomId);

    if (!room) {
        return null;
    }

    const participant = room.participants.find(participant => participant.user.id === userId);

    if (!participant) {
        return null;
    }

    participant.handRaised = handRaised;

    return room;
}