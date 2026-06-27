import express from "express";
import jwt from "jsonwebtoken";
import { getMeetingHistory } from "../services/meetingService.js";

const router = express.Router();

router.get("/history", async (req, res) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        const token = authHeader.split(" ")[1];

        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const meetings = await getMeetingHistory(payload.id);

        res.json(meetings);

    } catch (error) {

        console.error(error);

        res.status(401).json({
            error: "Invalid token"
        });

    }

});

export default router;