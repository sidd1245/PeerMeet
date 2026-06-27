import { getToken } from "./storage.js";

export async function getMeetingHistory() {

    const response = await fetch(
        "http://localhost:3000/api/meetings/history",
        {
            headers: {
                Authorization: `Bearer ${getToken()}`
            }
        }
    );

    if (!response.ok) {
        throw new Error("Failed to load meeting history");
    }

    return response.json();

}