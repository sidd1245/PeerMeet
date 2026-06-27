import {
    connectRoom,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    setScreenShareStoppedHandler,
    switchCamera,
    switchMicrophone,
    disconnectRoom
} from "../features/livekit/roomConnection.js";

import {
    saveUser, getUser, saveToken, getToken, removeToken, removeUser
} from "../services/storage.js";

import {
    socket, connectSocket
} from "../services/socket.js";

import {
    addNotification
} from "../features/presence/presenceActions.js";

import {
    getNotifications
} from "../features/presence/presenceState.js";

import {
    createRoom
} from "../features/room/roomService.js";

import {
    setRoomId
} from "../features/room/roomActions.js";

import {
    updateMediaStatus
} from "../features/call/mediaStatusActions.js";

import {
    getMediaStatus
} from "../features/call/mediaStatusState.js";

import {
    getParticipants
} from "../features/participants/participantState.js";
import {login, register} from "../services/authApi.js";
import {getMeetingHistory} from "../services/meetingApi.js";

export function createMeetingApp({authPage, lobbyPage, preJoinPage, roomPage, notificationCenter}) {

    let mySocketId = null;
    let handRaised = false;
    let localUser = getUser();
    let pendingRoomId = null;
    let pendingActivityMessage = "";
    let pendingMediaPreferences = {
        audioEnabled: true, videoEnabled: true
    };
    let currentRoom = null;

    async function init() {

        bindSocketEvents();
        bindAuthEvents();
        bindLobbyEvents();
        bindPreJoinEvents();
        bindRoomEvents();
        const params = new URLSearchParams(window.location.search);

        const roomFromUrl = params.get("room");
        authPage.hide();
        lobbyPage.hide();
        preJoinPage.hide();

        roomPage.hide();
        if (roomFromUrl) {
            lobbyPage.setRoomId(roomFromUrl);

        }
        if (localUser?.name) {
            authPage.setEmail(localUser.email);
            lobbyPage.setUser(localUser);
            const history = await getMeetingHistory(localUser.id);
            lobbyPage.renderMeetingHistory(history);
            connectSocket();
            showLobby();
        } else {
            authPage.show();

        }
        preJoinPage.setMeetingLink(getMeetingLink(lobbyPage.getRoomId()));

        roomPage.showEmptyStates();

    }

    function bindSocketEvents() {

        socket.on("connect", () => {
            mySocketId = socket.id;
            lobbyPage.setStatus("Ready", "ready");
            roomPage.log("Connected to backend");
        });

        socket.on("connect_error", error => {
            //console.error(error);
            lobbyPage.setStatus("Connection failed", "error");
        });

        socket.on("disconnect", () => {
            lobbyPage.setStatus("Disconnected", "warning");
        });

        socket.on("room-updated", room => {
            //console.log(room);
            handleRoomUpdated(room);
        });

        socket.on("participant-joined", participant => {
            pushActivity(`${participant.user.name} joined`);
            renderActivity();
        });

        socket.on("participant-left", participant => {
            pushActivity(`${participant.user.name} left`);
            renderActivity();
        });

        socket.on("screen-share-started", data => {
            pushActivity(`${data.userName} started presenting`);
            roomPage.showPresenting(`${data.userName} is presenting`);
            renderActivity();
        });

        socket.on("screen-share-stopped", data => {
            pushActivity(`${data.userName} stopped presenting`);
            roomPage.hidePresenting();
            renderActivity();
        });

        socket.on("meeting-ended", async () => {
            await disconnectRoom(); // Leave LiveKit cleanly
            localStorage.removeItem("currentRoom");
            roomPage.hide();
            lobbyPage.show();
            notificationCenter.notify("Meeting ended because the host left.");
        });

        socket.on("force-mute", async () => {
            await forceMuteLocalUser();
        });

        socket.on("activity", data => {
            pushActivity(data.message);
            renderActivity();
        });

        socket.on("media-status-updated", data => {
            updateMediaStatus(data.userId, data.audioEnabled, data.videoEnabled);
            renderParticipants();
        });

        socket.on("chat-message", data => {
            roomPage.addChatMessage({
                sender: data.user, text: data.message, isYou: data.user === localUser?.name
            });
        });

    }

    function bindAuthEvents() {

        authPage.onSignIn(async () => {

            try {

                const profile = authPage.getProfile();

                const response = await login(profile.email, profile.password);

                saveToken(response.token);

                saveUser(response.user);

                localUser = response.user;

                connectSocket();

                lobbyPage.setUser(localUser);

                notificationCenter.notify(`Welcome ${localUser.name}`);

                showLobby();

            } catch (error) {

                notificationCenter.notify(error.message, "error");

            }

        });

        authPage.onRegister(async () => {

            try {

                const profile = authPage.getProfile();

                await register(profile);

                notificationCenter.notify("Registration successful. Please sign in.");

            } catch (error) {

                notificationCenter.notify(error.message, "error");

            }

        });
    }

    function bindLobbyEvents() {

        lobbyPage.onCreate(async () => {
            if (!ensureUserReady()) {
                return;
            }

            const roomId = createRoom();
            await openPreJoin(roomId, `Created room ${roomId}`);
        });

        lobbyPage.onJoin(async () => {
            if (!ensureUserReady()) {
                return;
            }

            const roomId = lobbyPage.getRoomId();

            if (!roomId) {
                lobbyPage.focusRoomInput();
                return;
            }

            await openPreJoin(roomId, `Joined room ${roomId}`);
        });

        preJoinPage.onCopyLink(async () => {
            const roomId = roomPage.getCurrentRoom() === "None" ? lobbyPage.getRoomId() : roomPage.getCurrentRoom();

            if (!roomId || roomId === "None") {
                return;
            }

            await navigator.clipboard.writeText(getMeetingLink(roomId));
            preJoinPage.markLinkCopied();
        });

        lobbyPage.onRoomInput(() => {
            preJoinPage.setMeetingLink(getMeetingLink(lobbyPage.getRoomId()));
        });

        lobbyPage.onLogout(() => {
            socket.disconnect();
            removeToken();
            removeUser();
            localUser = null;
            authPage.clear();
            lobbyPage.hide();
            authPage.show();
        });

    }

    function bindPreJoinEvents() {

        preJoinPage.onJoinNow(async () => {
            await confirmJoin();
        });

        preJoinPage.onBack(() => {
            preJoinPage.hide();
            showLobby();
        });

    }

    function bindRoomEvents() {

        setScreenShareStoppedHandler(() => {

            roomPage.hidePresenting();
            roomPage.setLocalPresenting(false);

        });

        roomPage.onCameraChanged(async deviceId => {

            await switchCamera(deviceId);

        });

        roomPage.onMicrophoneChanged(async deviceId => {

            await switchMicrophone(deviceId);

        });

        roomPage.onSendChat(sendChatMessage);

        roomPage.onLeave(() => {
            location.reload();
        });

        roomPage.onEndMeeting(() => {
            socket.emit("end-meeting", roomPage.getCurrentRoom());
        });

        roomPage.onMuteAll(() => {
            socket.emit("mute-all", roomPage.getCurrentRoom());
        });

        roomPage.onLockRoom(() => {
            if (!currentRoom) {
                return;
            }
            const roomId = roomPage.getCurrentRoom();
            if (currentRoom.locked) {
                socket.emit("unlock-room", {
                    roomId
                });
            } else {
                socket.emit("lock-room", {
                    roomId
                });
            }
        });

        roomPage.onToggleMicrophone(async () => {
            const audioEnabled = await toggleMicrophone();

            if (typeof audioEnabled !== "boolean") {
                return;
            }

            roomPage.setMuteState(audioEnabled);
            emitMediaStatus({audioEnabled});
        });

        roomPage.onToggleCamera(async () => {
            const videoEnabled = await toggleCamera();

            if (typeof videoEnabled !== "boolean") {
                return;
            }

            roomPage.setCameraState(videoEnabled);
            emitMediaStatus({videoEnabled});
        });

        roomPage.onShareScreen(async () => {

            const started = await toggleScreenShare();

            if (started) {

                roomPage.showPresenting("You are presenting");

                roomPage.setLocalPresenting(true);

            } else {

                roomPage.hidePresenting();
                roomPage.setLocalPresenting(false);

            }

        });

        roomPage.onRaiseHand(() => {
            handRaised = !handRaised;

            socket.emit(handRaised ? "raise-hand" : "lower-hand", {
                roomId: roomPage.getCurrentRoom()
            });

            roomPage.setHandRaised(handRaised);
        });

    }

    async function openPreJoin(roomId, activityMessage) {

        pendingRoomId = roomId;
        pendingActivityMessage = activityMessage;

        lobbyPage.setRoomId(roomId);
        preJoinPage.setMeetingLink(getMeetingLink(roomId));
        preJoinPage.setRoomId(roomId);
        preJoinPage.setUser(localUser);

        lobbyPage.hide();
        await preJoinPage.show();

    }

    async function confirmJoin() {
        preJoinPage.setUser(localUser);
        pendingMediaPreferences = preJoinPage.getPreferences();
        const joined = await enterRoom(
            pendingRoomId,
            pendingActivityMessage
        );
        if (!joined) {
            return;
        }
        authPage.hide();
        lobbyPage.hide();
        preJoinPage.hide();
        roomPage.show();
    }

    async function enterRoom(roomId, activityMessage) {
        lobbyPage.setRoomId(roomId);
        preJoinPage.setMeetingLink(getMeetingLink(roomId));
        roomPage.setCurrentRoom(roomId);
        roomPage.setMeetingStatus("Connecting...", "warning");
        setRoomId(roomId);
        if (!socket.connected) {
            await new Promise(resolve => {
                socket.once("connect", resolve);
            });
        }
        try{
            await new Promise((resolve, reject) => {
                socket.once("join-approved", resolve);
                socket.once("join-denied", data => {
                    reject(new Error(data.reason));
                });
                socket.emit("join-room", {
                    roomId
                });
            });
        }catch(error){
            notificationCenter.notify(error.message, "error");
            return false;
        }

        await connectRoom({
            roomName: roomId,
            identity: localUser.id,
            name: localUser.name,
            onReconnecting: () => {
                notificationCenter.notify("Reconnecting...");
                roomPage.setMeetingStatus("Reconnecting", "warning");
            },
            onReconnected: () => {
                notificationCenter.notify("Connection restored");
                roomPage.setMeetingStatus("Live", "Live");
            },
            onDisconnected: () => {
                notificationCenter.notify("Connection lost", "error");
            }
        });
        await applyInitialMediaPreferences();
        roomPage.setMeetingStatus("Live", "Live");
        pushActivity(activityMessage);
        renderActivity();
        return true;
    }

    function handleRoomUpdated(room) {
        currentRoom = room;
        const {
            hostId, participants, locked
        } = room;
        updateParticipants(participants);
        const host = participants.find(participant => participant.user.id === hostId);
        if (host) {
            roomPage.setHostName(host.user.name);
        }
        roomPage.setHostControlsVisible(localUser.id === hostId);
        roomPage.setRoomLocked(locked);
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

        roomPage.renderParticipants({
            participants: getParticipants(), mediaStatusFor: getMediaStatus, hostName: roomPage.getHostName()
        });

    }

    function renderActivity() {

        roomPage.renderActivity(getNotifications());

    }

    function pushActivity(message) {

        addNotification(message);
        notificationCenter.notify(message);

    }

    function sendChatMessage() {

        const text = roomPage.getChatText();

        if (!text) {
            return;
        }

        socket.emit("chat-message", {
            roomId: roomPage.getCurrentRoom(), user: localUser.name, message: text
        });

        roomPage.addChatMessage({
            sender: "You", text, isYou: true
        });

        roomPage.clearChatText();

    }

    async function forceMuteLocalUser() {

        const current = getMediaStatus(localUser.id) || {
            audioEnabled: true, videoEnabled: true
        };

        if (!current.audioEnabled) {
            return;
        }

        await toggleMicrophone();
        updateMediaStatus(localUser.id, false, current.videoEnabled);

        socket.emit("media-status-changed", {
            roomId: roomPage.getCurrentRoom(), audioEnabled: false, videoEnabled: current.videoEnabled
        });

        roomPage.setMuteState(false);
        renderParticipants();

    }

    function emitMediaStatus(nextStatus) {

        const current = getMediaStatus(localUser.id) || {
            audioEnabled: true, videoEnabled: true
        };

        const audioEnabled = nextStatus.audioEnabled ?? current.audioEnabled;
        const videoEnabled = nextStatus.videoEnabled ?? current.videoEnabled;

        updateMediaStatus(localUser.id, audioEnabled, videoEnabled);

        socket.emit("media-status-changed", {
            roomId: roomPage.getCurrentRoom(), audioEnabled, videoEnabled
        });

        renderParticipants();

    }

    async function applyInitialMediaPreferences() {

        const current = getMediaStatus(localUser.id) || {
            audioEnabled: true, videoEnabled: true
        };

        let audioEnabled = current.audioEnabled;
        let videoEnabled = current.videoEnabled;

        if (!pendingMediaPreferences.audioEnabled && current.audioEnabled) {
            audioEnabled = await toggleMicrophone();
        }

        if (!pendingMediaPreferences.videoEnabled && current.videoEnabled) {
            videoEnabled = await toggleCamera();
        }

        updateMediaStatus(localUser.id, audioEnabled, videoEnabled);
        roomPage.setMuteState(audioEnabled);
        roomPage.setCameraState(videoEnabled);

    }

    function ensureUserReady() {
        return !!localUser?.name;
    }

    function showLobby() {

        authPage.hide();
        preJoinPage.hide();
        roomPage.hide();
        lobbyPage.show();

    }

    function getMeetingLink(roomId) {

        return roomId ? `${window.location.origin}?room=${roomId}` : "";

    }

    return {
        init
    };

}
