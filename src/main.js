import "./styles/index.css";

import {
    createMeetingApp
} from "./app/meetingApp.js";

import {
    createAuthPage
} from "./pages/Auth/auth.js";

import {
    createLobbyPage
} from "./pages/Lobby/lobby.js";

import {
    createPreJoinPage
} from "./pages/PreJoin/prejoin.js";

import {
    createRoomPage
} from "./pages/Room/room.js";

import {
    createNotificationCenter
} from "./components/NotificationCenter/NotificationCenter.js";

import "./features/participants/activeSpeakerUI.js";

const root = document.getElementById("app");

const authPage = createAuthPage();
const lobbyPage = createLobbyPage();
const preJoinPage = createPreJoinPage();
const roomPage = createRoomPage();
const notificationCenter = createNotificationCenter();

root.append(
    authPage.element,
    lobbyPage.element,
    preJoinPage.element,
    roomPage.element,
    notificationCenter.element
);

createMeetingApp({
    authPage,
    lobbyPage,
    preJoinPage,
    roomPage,
    notificationCenter
}).init();
