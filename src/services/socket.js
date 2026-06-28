import { io } from "socket.io-client";
import { getToken } from "./storage.js";

const API_URL = import.meta.env.VITE_API_URL;

export const socket = io(API_URL, {
    autoConnect: false
});

socket.on("connect", () => {
    //console.log("✅ CONNECTED", socket.id);
});

socket.on("connect_error", (err) => {
    //console.error("❌ CONNECT ERROR", err.message);
});

socket.on("disconnect", (reason) => {
    //console.log("❌ DISCONNECTED", reason);
});

export function connectSocket() {

    socket.auth = {
        token: getToken()
    };

    //console.log("TOKEN:", getToken());

    socket.connect();
}