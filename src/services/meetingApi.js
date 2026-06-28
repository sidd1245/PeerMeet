import { getToken } from "./storage.js";

export async function getMeetingHistory() {

    const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/meetings/history`,
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