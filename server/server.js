import express from "express";
import http from "http";
import cors from "cors";
import {Server} from "socket.io";
import authRoutes from "./routes/authRoutes.js";
import {setupSocket} from "./socket.js";
import {createLiveKitToken} from "./livekit.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);
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
            roomName, identity, name
        } = req.body;

        if (!roomName || !identity) {

            return res.status(400).json({
                error: "roomName and identity required"
            });

        }

        const result = await createLiveKitToken({
            roomName, identity, name
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