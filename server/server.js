import express from "express";

import http from "http";

import cors from "cors";

import {
    Server
} from "socket.io";

import {
    setupSocket
} from "./socket.js";

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

setupSocket(io);

server.listen(3000, () => {

    console.log("Server running on port 3000");

});