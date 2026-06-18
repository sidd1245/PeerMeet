import Peer from "peerjs";

let peer = null;

export function createPeer() {

    peer = new Peer(undefined, {
        debug: 2
    });
    peer.on("disconnected", () => {
        console.log("PeerJS disconnected");
    });

    peer.on("error", error => {
        console.error("PeerJS error:", error);
    });

    peer.on("close", () => {
        console.log("PeerJS closed");
    });
    return peer;
}

export function getPeer() {
    return peer;
}

export function getPeerId() {
    return peer?.id;
}

export function destroyPeer() {

    if (peer) {

        peer.destroy();

        peer = null;
    }
}