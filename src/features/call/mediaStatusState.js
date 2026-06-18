const mediaStatus =
    new Map();

export function setMediaStatus(
    userId,
    status
) {

    mediaStatus.set(
        userId,
        status
    );

}

export function getMediaStatus(
    userId
) {

    return mediaStatus.get(
        userId
    );

}

export function getAllMediaStatus() {

    return mediaStatus;

}