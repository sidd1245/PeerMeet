import {
    createPeer
} from "./features/peerjs/peerManager.js";

import {
    getCalls, removeCall, removeRemoteStream
} from "./features/call/callState.js";

import {
    removeRemoteVideo
} from "./features/call/videoRenderer.js";

import {
    initializeCalls, setupIncomingCalls, callParticipant, toggleCamera, toggleMicrophone
} from "./features/call/callManager.js";

import {
    connectToPeer, setConnection, sendMessage
} from "./features/peerjs/dataConnectionManager.js";

import {
    saveUser, getUser
} from "./services/storage.js";

import {
    socket
} from "./services/socket.js";

import {
    addParticipant
} from "./features/participants/participantActions.js";

import {
    getParticipants
} from "./features/participants/participantState.js";

import {
    addNotification
} from "./features/presence/presenceActions.js";

import {
    getNotifications
} from "./features/presence/presenceState.js";

import {
    createRoom
} from "./features/room/roomService.js";

import {
    setRoomId
} from "./features/room/roomActions.js";

import {
    updateMediaStatus
} from "./features/call/mediaStatusActions.js";

import {
    getMediaStatus
} from "./features/call/mediaStatusState.js";

import {
    startScreenSharing, //stopScreenSharing, setScreenShareStoppedCallback
} from "./features/call/screenShareManager.js";

const peerIdDiv = document.getElementById("peerId");

const remotePeerInput = document.getElementById("remotePeerId");

const messageInput = document.getElementById("message");

const messagesDiv = document.getElementById("messages");

const chatMessages = document.getElementById("chatMessages");

const connectBtn = document.getElementById("connectBtn");

const sendBtn = document.getElementById("sendBtn");

const roomInput = document.getElementById("roomInput");

const createRoomBtn = document.getElementById("createRoomBtn");

const joinRoomBtn = document.getElementById("joinRoomBtn");

const leaveRoomBtn = document.getElementById("leaveRoomBtn");

const endMeetingBtn = document.getElementById("endMeetingBtn");

const currentRoom = document.getElementById("currentRoom");

const muteBtn = document.getElementById("muteBtn");

const cameraBtn = document.getElementById("cameraBtn");

const shareScreenBtn = document.getElementById("shareScreenBtn");

const raiseHandBtn = document.getElementById("raiseHandBtn");

const copyMeetingLinkBtn = document.getElementById("copyMeetingLinkBtn");

const muteAllBtn = document.getElementById("muteAllBtn");

let peerId = null;
let mySocketId = null;
let handRaised = false;
//let isScreenSharing = false;

// setScreenShareStoppedCallback(() => {
//
//     isScreenSharing = false;
//
//     shareScreenBtn.textContent = "Share Screen";
//
// });
// let allMuted = false;

let localUser = getUser();

const params = new URLSearchParams(window.location.search);

const roomFromUrl = params.get("room");

if (roomFromUrl) {

    roomInput.value = roomFromUrl;

}

if (!localUser) {

    const name = prompt("Enter your name");

    localUser = {
        id: crypto.randomUUID(), name
    };

    saveUser(localUser);

}

const peer = createPeer();

setupIncomingCalls(peer);

peer.on("open", id => {

    peerId = id;

    peerIdDiv.textContent = id;

    log(`My Peer ID: ${id}`);

});

socket.on("connect", () => {

    mySocketId = socket.id;

    log("Connected To Backend");

});

socket.on("room-updated", room => {

    const {hostId, participants} = room;

    updateParticipants(participants);

    const activePeerIds = participants.map(participant => participant.peerId);

    getCalls().forEach((call, peerId) => {

        if (!activePeerIds.includes(peerId)) {

            call.close();

            removeCall(peerId);

            removeRemoteStream(peerId);

            removeRemoteVideo(peerId);

        }

    });

    const host = participants.find(participant => participant.socketId === hostId);

    if (host) {

        document
            .getElementById("hostName").textContent = host.user.name;

    }

    if (mySocketId === hostId) {

        document
            .getElementById("hostControls").style.display = "block";

    } else {

        document
            .getElementById("hostControls").style.display = "none";

    }

    participants.forEach(participant => {

        if (participant.peerId === peerId) {
            return;
        }

        callParticipant(peer, participant.peerId);

    });

    // log(`Room Updated (${participants.length})`);

});

socket.on("participant-joined", participant => {

    addNotification(`${participant.user.name} joined`);

    renderActivity();

});

socket.on("participant-left", participant => {

    addNotification(`${participant.user.name} left`);

    renderActivity();

});

socket.on("screen-share-started", data => {

    addNotification(`🖥 ${data.userName} started presenting`);

    renderActivity();

});

socket.on("screen-share-stopped", data => {

    addNotification(`🖥 ${data.userName} stopped presenting`);

    renderActivity();

});

socket.on("meeting-ended", () => {

    localStorage.removeItem("currentRoom");

    alert("Meeting ended by host");

    location.reload();

});

socket.on("force-mute", () => {

    const current = getMediaStatus(localUser.id) || {
        audioEnabled: true, videoEnabled: true
    };

    if (current.audioEnabled) {

        toggleMicrophone();

        updateMediaStatus(localUser.id, false, current.videoEnabled);

        socket.emit("media-status-changed", {
            roomId: currentRoom.textContent,

            userId: localUser.id,

            audioEnabled: false,

            videoEnabled: current.videoEnabled
        });

        renderParticipants();

    }

});

socket.on("activity", data => {

    addNotification(data.message);

    renderActivity();

});

// socket.on("force-unmute", () => {
//
//     const current = getMediaStatus(localUser.id) || {
//         audioEnabled: true, videoEnabled: true
//     };
//
//     if (!current.audioEnabled) {
//
//         toggleMicrophone();
//
//         updateMediaStatus(localUser.id, true, current.videoEnabled);
//
//         socket.emit("media-status-changed", {
//             roomId: currentRoom.textContent,
//
//             userId: localUser.id,
//
//             audioEnabled: true,
//
//             videoEnabled: current.videoEnabled
//         });
//
//         renderParticipants();
//
//     }
//
// });

socket.on("media-status-updated", data => {

    updateMediaStatus(data.userId, data.audioEnabled, data.videoEnabled);

    renderParticipants();

});

socket.on("chat-message", data => {

    addChatMessage(`${data.user}: ${data.message}`);

});

function ensurePeerReady() {

    if (peerId) {
        return true;
    }

    alert("Call connection is still starting. Try again in a moment.");

    return false;

}


createRoomBtn
    .addEventListener("click", async () => {

        if (!ensurePeerReady()) {
            return;
        }

        const roomId = createRoom();

        const meetingLink = `${window.location.origin}?room=${roomId}`;

        roomInput.value = roomId;

        currentRoom.textContent = roomId;

        setRoomId(roomId);

        await initializeCalls();

        socket.emit("join-room", {
            roomId, user: localUser, peerId
        });

        addNotification(`Created room ${roomId}`);

        renderActivity();

    });

copyMeetingLinkBtn
    .addEventListener("click", async () => {

        const roomId = currentRoom.textContent;

        if (!roomId || roomId === "None") {
            return;
        }

        const meetingLink = `${window.location.origin}?room=${roomId}`;

        await navigator
            .clipboard
            .writeText(meetingLink);

        alert("Meeting link copied");

    });

joinRoomBtn
    .addEventListener("click", async () => {

        if (!ensurePeerReady()) {
            return;
        }

        const roomId = roomInput.value.trim();

        if (!roomId) return;

        setRoomId(roomId);

        currentRoom.textContent = roomId;

        await initializeCalls();

        socket.emit("join-room", {
            roomId, user: localUser, peerId
        });

        addNotification(`Joined room ${roomId}`);

        renderActivity();

    });

leaveRoomBtn
    .addEventListener("click", () => {

        location.reload();

    });

endMeetingBtn
    .addEventListener("click", () => {

        const roomId = currentRoom.textContent;

        socket.emit("end-meeting", roomId);

    });

muteAllBtn
    .addEventListener("click", () => {

        socket.emit("mute-all", currentRoom.textContent);

    });

peer.on("connection", conn => {

    setConnection(conn.peer, conn);

    setupConnection(conn);

});

sendBtn
    .addEventListener("click", () => {

        const text = messageInput.value.trim();

        if (!text) {
            return;
        }

        socket.emit("chat-message", {
            roomId: currentRoom.textContent,

            user: localUser.name,

            message: text
        });

        addChatMessage(`You: ${text}`);

        messageInput.value = "";

    });

muteBtn
    .addEventListener("click", () => {

        const audioEnabled = toggleMicrophone();

        muteBtn.textContent = audioEnabled ? "Mute" : "Unmute";

        const current = getMediaStatus(localUser.id) || {
            audioEnabled: true, videoEnabled: true
        };

        updateMediaStatus(localUser.id, audioEnabled, current.videoEnabled);

        socket.emit("media-status-changed", {
            roomId: currentRoom.textContent,

            userId: localUser.id,

            audioEnabled,

            videoEnabled: current.videoEnabled
        });

        renderParticipants();

    });

cameraBtn
    .addEventListener("click", () => {

        const videoEnabled = toggleCamera();

        cameraBtn.textContent = videoEnabled ? "Camera Off" : "Camera On";

        const current = getMediaStatus(localUser.id) || {
            audioEnabled: true, videoEnabled: true
        };

        updateMediaStatus(localUser.id, current.audioEnabled, videoEnabled);

        socket.emit("media-status-changed", {
            roomId: currentRoom.textContent,

            userId: localUser.id,

            audioEnabled: current.audioEnabled,

            videoEnabled
        });

        renderParticipants();

    });

shareScreenBtn
    .addEventListener("click", async () => {

        await startScreenSharing();

    });

raiseHandBtn
    .addEventListener("click", () => {

        handRaised = !handRaised;

        socket.emit(handRaised ? "raise-hand" : "lower-hand", {
            roomId: currentRoom.textContent,

            userId: localUser.id
        });

        raiseHandBtn.textContent = handRaised ? "Lower Hand" : "Raise Hand";

    });

function setupConnection(conn) {

    conn.on("open", () => {

        log("Connection Open");

    });

    conn.on("data", data => {

        log(`Remote: ${data}`);

    });

}

function updateParticipants(participants) {

    const store = getParticipants();

    store.clear();

    participants.forEach(participant => {

        store.set(participant.user.id, {
            ...participant.user, handRaised: participant.handRaised || false
        });

        if (!getMediaStatus(participant.user.id)) {

            updateMediaStatus(participant.user.id, true, true);

        }

    });

    renderParticipants();

}

function renderParticipants() {

    const container = document.getElementById("participants");

    const count = document.getElementById("participantCount");

    container.innerHTML = "";

    const participants = getParticipants();

    count.textContent = participants.size;

    const hostName = document
        .getElementById("hostName").textContent;

    participants.forEach(participant => {

        const card = document.createElement("div");

        card.className = "participant-card";

        const name = document.createElement("div");


        name.className = "participant-name";

        name.textContent = participant.handRaised ? `✋ ${participant.name}` : participant.name;

        if (participant.name === hostName) {

            name.textContent += " (Host)";
        }

        const status = document.createElement("div");

        status.className = "participant-status";

        const media = getMediaStatus(participant.id) || {
            audioEnabled: true, videoEnabled: true
        };

        status.textContent = `${media.audioEnabled ? "🎤 On" : "🔇 Muted"}
     ${media.videoEnabled ? "📷 On" : "🚫 Camera Off"}`;

        card.appendChild(name);

        card.appendChild(status);

        container.appendChild(card);

    });

}

function renderActivity() {

    const container = document.getElementById("activity");

    container.innerHTML = "";

    getNotifications()
        .forEach(notification => {

            const div = document.createElement("div");

            div.textContent = notification.message;

            container.appendChild(div);

        });

}

function log(message) {

    const div = document.createElement("div");

    div.textContent = message;

    messagesDiv.appendChild(div);

    messagesDiv.scrollTop = messagesDiv.scrollHeight;

}

function addChatMessage(message) {

    const div = document.createElement("div");

    div.textContent = message;

    chatMessages.appendChild(div);

    chatMessages.scrollTop = chatMessages.scrollHeight;

}
