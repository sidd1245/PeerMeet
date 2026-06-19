import express from "express";
import http from "http";
import cors from "cors";
import {Server} from "socket.io";

import {setupSocket} from "./socket.js";
import {createLiveKitToken} from "./livekit.js";

import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

setupSocket(io);

app.post("/api/livekit/token", async (req, res) => {

    try {

        const {
            roomName, identity
        } = req.body;

        if (!roomName || !identity) {

            return res.status(400).json({
                error: "roomName and identity required"
            });

        }

        const result = await createLiveKitToken({
            roomName, identity
        });

        return res.json(result);

    } catch (error) {

        console.error("LiveKit token error:", error);

        return res.status(500).json({
            error: "Failed to generate token"
        });

    }

});

server.listen(3000, () => {

    console.log("Server running on port 3000");

});