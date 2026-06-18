let connectionMap =
    new Map();

export function connectToPeer(
    peer,
    remotePeerId
) {

    if (
        connectionMap.has(
            remotePeerId
        )
    ) {

        return connectionMap.get(
            remotePeerId
        );

    }

    const conn =
        peer.connect(
            remotePeerId
        );

    connectionMap.set(
        remotePeerId,
        conn
    );

    return conn;
}

export function setConnection(
    peerId,
    conn
) {

    connectionMap.set(
        peerId,
        conn
    );
}

export function getConnection(
    peerId
) {

    return connectionMap.get(
        peerId
    );
}

export function getConnections() {

    return connectionMap;
}

export function sendMessage(
    message
) {

    connectionMap.forEach(
        conn => {

            conn.send(
                message
            );

        }
    );

    return true;
}