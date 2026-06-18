import { state } from "../../app/store.js";

export function addParticipant(
    participant
) {

    state.participants.set(
        participant.id,
        participant
    );
}

export function removeParticipant(
    participantId
) {

    state.participants.delete(
        participantId
    );
}

export function getParticipant(
    participantId
) {

    return state.participants.get(
        participantId
    );
}

export function setHandRaised(
    participantId,
    handRaised
) {

    const participant =
        state.participants.get(
            participantId
        );

    if (!participant) {
        return;
    }

    participant.handRaised =
        handRaised;
}