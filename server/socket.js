import {
    joinRoom, removeParticipant, deleteRoom, isHost, setHandRaised
} from "./rooms.js";

export function setupSocket(io) {

    io.on("connection", socket => {

        console.log("Connected:", socket.id);

        socket.on("media-status-changed", data => {
            console.log("media status changed:", data);
            socket.to(data.roomId).emit("media-status-updated", data);

        });

        socket.on("chat-message", data => {

            socket.to(data.roomId).emit("chat-message", data);

        });

        socket.on("raise-hand", ({roomId, userId}) => {

            const room = setHandRaised(roomId, userId, true);

            if (room) {

                io.to(roomId).emit("room-updated", room);

                io.to(roomId).emit("activity", {
                    message: `${room.participants.find(p => p.user.id === userId)?.user.name} raised hand`
                });

            }

        });

        socket.on("lower-hand", ({roomId, userId}) => {

            const room = setHandRaised(roomId, userId, false);

            if (room) {

                io.to(roomId).emit("room-updated", room);

                io.to(roomId).emit("activity", {
                    message: `${room.participants.find(p => p.user.id === userId)?.user.name} lowered hand`
                });

            }

        });
        socket.on("screen-share-started", data => {

            socket.to(data.roomId).emit("screen-share-started", {
                userName: data.userName
            });

        });

        socket.on("screen-share-stopped", data => {

            socket.to(data.roomId).emit("screen-share-stopped", {
                userName: data.userName
            });

        });

        socket.on("mute-all", roomId => {

            if (!isHost(roomId, socket.id)) {
                return;
            }

            socket.to(roomId).emit("force-mute");

            io.to(roomId).emit("activity", {
                message: "Host muted all participants"
            });

        });

        // socket.on("unmute-all", roomId => {
        //
        //     if (!isHost(roomId, socket.id)) {
        //         return;
        //     }
        //
        //     socket.to(roomId).emit("force-unmute");
        //
        // });

        socket.on("join-room", data => {

            const {
                roomId, user, peerId
            } = data;

            const room = joinRoom(roomId, {
                socketId: socket.id,

                peerId,

                user
            });

            socket.join(roomId);

            socket.to(roomId).emit("participant-joined", {
                user, peerId
            });

            io.to(roomId).emit("room-updated", room);

        });

        socket.on("end-meeting", roomId => {

            if (!isHost(roomId, socket.id)) {

                return;

            }
            console.log("END MEETING RECEIVED", roomId, socket.id);
            deleteRoom(roomId);

            io.to(roomId).emit("meeting-ended");

        });

        socket.on("disconnect", () => {

            const result = removeParticipant(socket.id);

            if (result.roomId && result.room) {

                io.to(result.roomId).emit("room-updated", result.room);

                if (result.leftParticipant) {

                    io.to(result.roomId).emit("participant-left", {
                        user: result.leftParticipant.user
                    });

                }

            }

            console.log("Disconnected:", socket.id);

        });

    });

}