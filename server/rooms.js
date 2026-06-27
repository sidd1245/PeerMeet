const rooms = new Map();

export function joinRoom(roomId, participant) {

    if (!rooms.has(roomId)) {

        const room = {
            hostId: participant.user.id, locked: false, participants: [{
                ...participant, handRaised: false
            }]
        };

        rooms.set(roomId, room);

        return {
            room, created: true
        };

    }

    const room = rooms.get(roomId);

    room.participants.push({
        ...participant, handRaised: false
    });

    return {
        room, created: false
    };

}

export function removeParticipant(socketId) {

    let roomIdFound = null;
    let roomData = null;
    let leftParticipant = null;
    let hostLeft = false;
    rooms.forEach((room, roomId) => {
        const participant = room.participants.find(participant => participant.socketId === socketId);
        if (participant) {
            leftParticipant = participant;
        }
        const wasHost = participant && room.hostId === participant.user.id;
        const filtered = room.participants.filter(participant => participant.socketId !== socketId);
        if (filtered.length !== room.participants.length) {
            roomIdFound = roomId;
            if (wasHost) {
                hostLeft = true;
                rooms.delete(roomId);
                roomData = null;
            } else if (filtered.length === 0) {
                rooms.delete(roomId);
                roomData = null;
            } else {
                room.participants = filtered;
                roomData = room;
            }
        }
    });
    return {
        roomId: roomIdFound, room: roomData, leftParticipant, hostLeft
    };
}

export function getRoom(roomId) {
    return rooms.get(roomId);
}

export function deleteRoom(roomId) {
    rooms.delete(roomId);
}

export function isHost(roomId, userId) {
    const room = rooms.get(roomId);
    if (!room) {
        return false;
    }
    return (room.hostId === userId);
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

export function isParticipant(roomId, userId) {
    const room = rooms.get(roomId);
    if (!room) {
        return false;
    }
    return room.participants.some(participant => participant.user.id === userId);
}

export function lockRoom(roomId) {
    const room = rooms.get(roomId);
    if (!room) {
        return null;
    }
    room.locked = true;
    return room;
}

export function unlockRoom(roomId) {
    const room = rooms.get(roomId);
    if (!room) {
        return null;
    }
    room.locked = false;
    return room;
}

export function isRoomLocked(roomId) {
    return rooms.get(roomId)?.locked ?? false;
}