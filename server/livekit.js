import { AccessToken } from "livekit-server-sdk";

export async function createLiveKitToken({
                                             roomName,
                                             identity,
                                             name
                                         }) {

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    const token = new AccessToken(
        apiKey,
        apiSecret,
        {
            identity,
            name
        }
    );

    token.addGrant({
        roomJoin: true,
        room: roomName
    });

    return {
        token: await token.toJwt(),
        url: process.env.LIVEKIT_URL
    };
}