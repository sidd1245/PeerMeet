let localStream = null;

const activeCalls = new Map();

const remoteStreams = new Map();

export function setLocalStream(stream) {

    localStream = stream;

}

export function getLocalStream() {

    return localStream;

}

export function addCall(peerId, call) {

    activeCalls.set(peerId, call);

}

export function getCall(peerId) {

    return activeCalls.get(peerId);

}

export function getCalls() {

    return activeCalls;

}

export function removeCall(peerId) {

    activeCalls.delete(peerId);

}

export function addRemoteStream(peerId, stream) {

    remoteStreams.set(peerId, stream);

}

export function getRemoteStreams() {

    return remoteStreams;

}

export function removeRemoteStream(peerId) {

    remoteStreams.delete(peerId);

}

export function hasCall(peerId) {

    return activeCalls.has(peerId);

}

