import { io } from "socket.io-client";
import { getToken } from "./storage.js";

export const socket = io("http://localhost:3000", {
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