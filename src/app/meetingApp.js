import {
    connectRoom, toggleCamera, toggleMicrophone, toggleScreenShare, setScreenShareStoppedHandler
} from "../features/livekit/roomConnection.js";

import {
    saveUser, getUser
} from "../services/storage.js";

import {
    socket
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

export function createMeetingApp({authPage, lobbyPage, preJoinPage, roomPage, notificationCenter}) {

    let mySocketId = null;
    let handRaised = false;
    let localUser = getUser();
    let pendingRoomId = null;
    let pendingActivityMessage = "";
    let pendingMediaPreferences = {
        audioEnabled: true, videoEnabled: true
    };

    function init() {

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
            authPage.setName(localUser.name);
            authPage.setEmail(localUser.email);
            lobbyPage.setUserName(localUser.name);
            showLobby();
        } else {
            authPage.show();
        }

        lobbyPage.setMeetingLink(getMeetingLink(lobbyPage.getRoomId()));
        roomPage.showEmptyStates();

        bindSocketEvents();
        bindAuthEvents();
        bindLobbyEvents();
        bindPreJoinEvents();
        bindRoomEvents();

    }

    function bindSocketEvents() {

        socket.on("connect", () => {
            mySocketId = socket.id;
            lobbyPage.setStatus("Ready", "ready");
            roomPage.log("Connected to backend");
        });

        socket.on("room-updated", room => {
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

        socket.on("meeting-ended", () => {
            localStorage.removeItem("currentRoom");
            alert("Meeting ended by host");
            location.reload();
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

        authPage.onSignIn(() => {
            const profile = authPage.getProfile();

            if (!profile.name) {
                authPage.focusName();
                return;
            }

            localUser = {
                id: localUser?.id || crypto.randomUUID(), ...profile
            };

            saveUser(localUser);
            lobbyPage.setUserName(localUser.name);
            notificationCenter.notify(`Signed in as ${localUser.name}`);
            showLobby();
        });

        authPage.onGuest(() => {
            const profile = authPage.getGuestProfile();

            localUser = {
                id: localUser?.id || crypto.randomUUID(), ...profile
            };

            saveUser(localUser);
            lobbyPage.setUserName(localUser.name);
            notificationCenter.notify(`Continuing as ${localUser.name}`);
            showLobby();
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

        lobbyPage.onCopyLink(async () => {
            const roomId = roomPage.getCurrentRoom() === "None" ? lobbyPage.getRoomId() : roomPage.getCurrentRoom();

            if (!roomId || roomId === "None") {
                return;
            }

            await navigator.clipboard.writeText(getMeetingLink(roomId));
            lobbyPage.markLinkCopied();
        });

        lobbyPage.onRoomInput(() => {
            lobbyPage.setMeetingLink(getMeetingLink(lobbyPage.getRoomId()));
        });

    }

    function bindPreJoinEvents() {

        preJoinPage.onJoinNow(async () => {
            await confirmJoin();
        });

        preJoinPage.onAskToJoin(async () => {
            notificationCenter.notify("Request sent. Demo mode admits guests automatically.");
            setTimeout(() => {
                confirmJoin();
            }, 700);
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
                roomId: roomPage.getCurrentRoom(), userId: localUser.id
            });

            roomPage.setHandRaised(handRaised);
        });

    }

    async function openPreJoin(roomId, activityMessage) {

        pendingRoomId = roomId;
        pendingActivityMessage = activityMessage;

        lobbyPage.setRoomId(roomId);
        lobbyPage.setMeetingLink(getMeetingLink(roomId));
        preJoinPage.setRoomId(roomId);
        preJoinPage.setProfile(localUser);

        lobbyPage.hide();
        await preJoinPage.show();

    }

    async function confirmJoin() {

        const displayName = preJoinPage.getName();

        if (!displayName) {
            notificationCenter.notify("Enter a display name before joining.");
            return;
        }

        localUser = {
            ...localUser, name: displayName
        };

        saveUser(localUser);
        lobbyPage.setUserName(localUser.name);
        pendingMediaPreferences = preJoinPage.getPreferences();

        preJoinPage.hide();
        await enterRoom(pendingRoomId, pendingActivityMessage);

    }

    async function enterRoom(roomId, activityMessage) {

        lobbyPage.setRoomId(roomId);
        lobbyPage.setMeetingLink(getMeetingLink(roomId));
        roomPage.setCurrentRoom(roomId);
        roomPage.setMeetingStatus("Live");

        setRoomId(roomId);
        authPage.hide();
        lobbyPage.hide();
        preJoinPage.hide();
        roomPage.show();

        await connectRoom({
            roomName: roomId, identity: localUser.id, name: localUser.name
        });

        // await initializeLocalMedia();

        await applyInitialMediaPreferences();

        socket.emit("join-room", {
            roomId, user: localUser
        });

        pushActivity(activityMessage);
        renderActivity();

    }

    function handleRoomUpdated(room) {

        const {
            hostId, participants
        } = room;

        updateParticipants(participants);
        // closeDisconnectedCalls(participants);

        const host = participants.find(participant => participant.socketId === hostId);

        if (host) {
            roomPage.setHostName(host.user.name);
        }

        roomPage.setHostControlsVisible(mySocketId === hostId);

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
            roomId: roomPage.getCurrentRoom(),
            userId: localUser.id,
            audioEnabled: false,
            videoEnabled: current.videoEnabled
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
            roomId: roomPage.getCurrentRoom(), userId: localUser.id, audioEnabled, videoEnabled
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

        const name = lobbyPage.getUserName();

        if (!name) {
            lobbyPage.focusUserName();
            return false;
        }

        localUser = {
            id: localUser?.id || crypto.randomUUID(), name
        };

        saveUser(localUser);
        return true;

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
