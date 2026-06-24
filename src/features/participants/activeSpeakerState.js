let activeSpeakerId = null;

const listeners = new Set();

export function setActiveSpeaker(id) {

    activeSpeakerId = id;

    listeners.forEach(
        listener => listener(id)
    );

}

export function getActiveSpeaker() {
    return activeSpeakerId;
}

export function onActiveSpeakerChanged(
    listener
) {
    listeners.add(listener);
}