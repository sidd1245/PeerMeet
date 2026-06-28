import {
    joinRoom, removeParticipant, deleteRoom, isHost, setHandRaised, isParticipant, lockRoom, unlockRoom, isRoomLocked
} from "./rooms.js";
import jwt from "jsonwebtoken";
import {createMeeting, endMeeting, updateParticipantCount} from "./services/meetingService.js";

export function setupSocket(io) {

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication required"));
        }
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = payload;
            next();
        } catch {
            return next(new Error("Invalid token"));
        }
    });

    io.on("connection", socket => {
        socket.on("media-status-changed", data => {
            if (!isParticipant(data.roomId, socket.user.id)) {
                return;
            }
            io.to(data.roomId).emit("media-status-updated", {
                userId: socket.user.id, audioEnabled: data.audioEnabled, videoEnabled: data.videoEnabled
            });
        });

        socket.on("chat-message", data => {
            if (!isParticipant(data.roomId, socket.user.id)) {
                return;
            }
            socket.to(data.roomId).emit("chat-message", {
                user: socket.user.name, message: data.message
            });
        });

        socket.on("raise-hand", ({roomId}) => {

            if (!isParticipant(roomId, socket.user.id)) {
                return;
            }

            const room = setHandRaised(roomId, socket.user.id, true);

            if (room) {

                io.to(roomId).emit("room-updated", room);

                io.to(roomId).emit("activity", {
                    message: `${socket.user.name} raised hand`
                });

            }

        });

        socket.on("lower-hand", ({roomId}) => {

            if (!isParticipant(roomId, socket.user.id)) {
                return;
            }

            const room = setHandRaised(roomId, socket.user.id, false);

            if (room) {

                io.to(roomId).emit("room-updated", room);

                io.to(roomId).emit("activity", {
                    message: `${socket.user.name} lowered hand`
                });

            }

        });

        socket.on("screen-share-started", data => {
            if (!isParticipant(data.roomId, socket.user.id)) {
                return;
            }
            socket.to(data.roomId).emit("screen-share-started", {
                userName: socket.user.name
            });
        });

        socket.on("screen-share-stopped", data => {
            if (!isParticipant(data.roomId, socket.user.id)) {
                return;
            }
            socket.to(data.roomId).emit("screen-share-stopped", {
                userName: data.userName
            });
        });

        socket.on("mute-all", roomId => {

            if (!isHost(roomId, socket.user.id)) {
                return;
            }

            socket.to(roomId).emit("force-mute");

            io.to(roomId).emit("activity", {
                message: "Host muted all participants"
            });

        });

        socket.on("lock-room", ({roomId}) => {
            if (!isHost(roomId, socket.user.id)) {
                return;
            }
            const room = lockRoom(roomId);
            io.to(roomId).emit("room-updated", room);
            io.to(roomId).emit("activity", {
                message: `${socket.user.name} locked the meeting`
            });
        });

        socket.on("unlock-room", ({roomId}) => {
            if (!isHost(roomId, socket.user.id)) {
                return;
            }
            const room = unlockRoom(roomId);
            io.to(roomId).emit("room-updated", room);
            io.to(roomId).emit("activity", {
                message: `${socket.user.name} unlocked the meeting`
            });
        });

        socket.on("join-room", async ({ roomId }) => {
            try {

                if (isParticipant(roomId, socket.user.id)) {
                    return;
                }

                if (isRoomLocked(roomId)) {
                    socket.emit("join-denied", {
                        reason: "Meeting is locked"
                    });
                    return;
                }

                const result = joinRoom(roomId, {
                    socketId: socket.id,
                    user: socket.user
                });

                const room = result.room;

                if (result.created) {
                    await createMeeting({
                        roomId,
                        hostId: socket.user.id
                    });
                }

                socket.join(roomId);

                await updateParticipantCount(
                    roomId,
                    room.participants.length
                );

                socket.emit("join-approved");

                socket.to(roomId).emit("participant-joined", {
                    user: socket.user
                });

                io.to(roomId).emit("room-updated", room);

            } catch (err) {

                console.error("JOIN ROOM ERROR:", err);

                socket.emit("join-denied", {
                    reason: "Server error"
                });

            }
        });

        socket.on("end-meeting", async roomId => {
            if (!isHost(roomId, socket.user.id)) {
                return;
            }
            //console.log("END MEETING RECEIVED", roomId, socket.user.id);
            await endMeeting(roomId);
            deleteRoom(roomId);
            io.to(roomId).emit("meeting-ended");
        });

        socket.on("disconnect", async () => {
            const result = removeParticipant(socket.id);
            if (result.hostLeft) {
                await endMeeting(result.roomId);
                io.to(result.roomId).emit("meeting-ended");
                deleteRoom(result.roomId);
                return;
            }
            if (result.roomId && result.room) {
                await updateParticipantCount(
                    result.roomId,
                    result.room.participants.length
                );
                io.to(result.roomId).emit("room-updated", result.room);
                if (result.leftParticipant) {
                    io.to(result.roomId).emit("participant-left", {
                        user: result.leftParticipant.user
                    });
                }
            }
            //console.log("Disconnected:", socket.id);
        });

    });

}